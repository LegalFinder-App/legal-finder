// Server-only. Per-user request limits for what costs money (the AI calls) or can be abused in
// bulk (uploads, checkouts, account deletion). Used by the web's server functions
// (rate-limit-middleware.ts) and the app's /api/mobile/* routes (mobile-api.server.ts).
//
// Counted in Postgres by consume_rate_limit() (migration 20261107090000_security_hardening.sql),
// so every serverless instance shares one count. Until that migration is applied, or if the
// database can't be reached, each instance counts in its own memory instead: weaker (instances
// don't share counts), but it still stops one client hammering a warm instance, and an outage of
// the limiter never takes the feature down with it.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type RateLimitRule = { limit: number; windowSeconds: number };

export const RATE_LIMITS = {
  // Each answer is a paid model call; a long conversation is still well inside this.
  assistant: { limit: 30, windowSeconds: 10 * 60 },
  drafting: { limit: 15, windowSeconds: 10 * 60 },
  documents: { limit: 30, windowSeconds: 10 * 60 },
  uploads: { limit: 30, windowSeconds: 10 * 60 },
  payments: { limit: 10, windowSeconds: 10 * 60 },
  account: { limit: 5, windowSeconds: 60 * 60 },
  push: { limit: 30, windowSeconds: 60 * 60 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

export class RateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("You're doing that too often. Please wait a few minutes and try again.");
    this.name = "RateLimitError";
  }
}

type Decision = { allowed: boolean; retryAfterSeconds: number };

// ---- in-memory fallback (fixed window per instance) ----

const memory = new Map<string, { hits: number; resetAt: number }>();
const MEMORY_MAX_KEYS = 10_000;

export function consumeInMemory(key: string, rule: RateLimitRule, now = Date.now()): Decision {
  let entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    if (memory.size >= MEMORY_MAX_KEYS) {
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
      // Still full of live windows: drop the oldest rather than grow without bound.
      if (memory.size >= MEMORY_MAX_KEYS) memory.delete(memory.keys().next().value as string);
    }
    entry = { hits: 0, resetAt: now + rule.windowSeconds * 1000 };
    memory.set(key, entry);
  }
  entry.hits += 1;
  return {
    allowed: entry.hits <= rule.limit,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

export function resetInMemoryLimits() {
  memory.clear();
}

// ---- shared count in Postgres ----

// consume_rate_limit isn't in the generated types until they're regenerated.
type RpcClient = {
  rpc: (
    fn: "consume_rate_limit",
    args: { p_key: string; p_limit: number; p_window_seconds: number },
  ) => PromiseLike<{
    data: { allowed: boolean; retry_after_seconds: number }[] | null;
    error: { message: string; code?: string } | null;
  }>;
};

// After a failure, skip the database for a while instead of paying a failed round trip on
// every request (e.g. before the migration is applied).
const RETRY_DATABASE_AFTER_MS = 5 * 60_000;
let databaseSkippedUntil = 0;

function fallBack(reason: unknown): null {
  if (Date.now() >= databaseSkippedUntil) {
    console.warn("[rate-limit] shared limiter unavailable, counting per instance:", reason);
  }
  databaseSkippedUntil = Date.now() + RETRY_DATABASE_AFTER_MS;
  return null;
}

async function consumeInDatabase(key: string, rule: RateLimitRule): Promise<Decision | null> {
  if (Date.now() < databaseSkippedUntil) return null;
  try {
    const { data, error } = await (supabaseAdmin as unknown as RpcClient).rpc(
      "consume_rate_limit",
      { p_key: key, p_limit: rule.limit, p_window_seconds: rule.windowSeconds },
    );
    const row = data?.[0];
    if (error || !row) return fallBack(error?.message ?? "no result");
    return { allowed: row.allowed, retryAfterSeconds: Math.max(1, row.retry_after_seconds) };
  } catch (error) {
    return fallBack(error);
  }
}

export function resetDatabaseFallback() {
  databaseSkippedUntil = 0;
}

/** Counts one request by this user against the bucket; throws RateLimitError once over. */
export async function enforceRateLimit(bucket: RateLimitBucket, userId: string): Promise<void> {
  const rule = RATE_LIMITS[bucket];
  const key = `${bucket}:${userId}`;
  const decision = (await consumeInDatabase(key, rule)) ?? consumeInMemory(key, rule);
  if (!decision.allowed) throw new RateLimitError(decision.retryAfterSeconds);
}
