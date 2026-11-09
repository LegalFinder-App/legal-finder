// Server-only. Plumbing for the /api/mobile/* routes the native app (apps/mobile) calls — the
// native counterparts of this app's server functions. The app sends its Clerk session token as a
// bearer header; clerkMiddleware (src/start.ts) verifies it exactly like a browser session cookie.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import type { AppDatabase } from "@/integrations/supabase/app-database";
import { UnauthorizedError, authenticateClerkRequest } from "@/integrations/supabase/auth.server";
import { RateLimitError, enforceRateLimit, type RateLimitBucket } from "@/lib/rate-limit.server";

export class BadRequestError extends Error {}
class PayloadTooLargeError extends Error {}

type Context = { request: Request; userId: string; supabase: SupabaseClient<AppDatabase> };

// The largest legitimate body is a 20-message assistant conversation (20 × 4,000 characters),
// a little over 240 KB if every character takes three bytes. Anything bigger is refused before
// it is parsed or validated.
export const MAX_BODY_BYTES = 256 * 1024;

async function readJsonBody(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) throw new PayloadTooLargeError();
  const text = await request.text().catch(() => "");
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new PayloadTooLargeError();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/**
 * POST handler: authenticates, applies the bucket's rate limit if one is given, parses + validates
 * the JSON body, and returns JSON or { error }.
 */
export function mobilePost<TBody, TResult>(
  schema: ZodType<TBody> | null,
  run: (ctx: Context, body: TBody) => Promise<TResult>,
  options: { rateLimit?: RateLimitBucket } = {},
) {
  return async ({ request }: { request: Request }): Promise<Response> => {
    try {
      const { userId, supabase } = await authenticateClerkRequest();
      if (options.rateLimit) await enforceRateLimit(options.rateLimit, userId);
      const raw = await readJsonBody(request);
      const body = schema ? schema.parse(raw) : (raw as TBody);
      const result = await run({ request, userId, supabase }, body);
      return Response.json(result ?? { ok: true });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return Response.json({ error: "Please sign in again." }, { status: 401 });
      }
      if (error instanceof RateLimitError) {
        return Response.json(
          { error: error.message },
          { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
        );
      }
      if (error instanceof PayloadTooLargeError) {
        return Response.json({ error: "That request is too large." }, { status: 413 });
      }
      if (error instanceof ZodError || error instanceof BadRequestError) {
        const message =
          error instanceof ZodError
            ? (error.issues[0]?.message ?? "Invalid request.")
            : error.message;
        return Response.json({ error: message }, { status: 400 });
      }
      console.error("[mobile-api]", new URL(request.url).pathname, error);
      // Domain errors thrown on purpose (e.g. "This payment has already been completed.") are
      // written for users; anything unexpected gets a generic message instead of internals.
      const message =
        error instanceof Error && !/supabase|fetch|ECONN|undefined|null/i.test(error.message)
          ? error.message
          : "Something went wrong. Please try again.";
      return Response.json({ error: message }, { status: 500 });
    }
  };
}
