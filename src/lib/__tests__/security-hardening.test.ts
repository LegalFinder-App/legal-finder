import { beforeEach, describe, expect, it, vi } from "vitest";

// The shared limiter calls a database function; tests switch between "available" and
// "not applied yet" to prove both paths, and that an outage never blocks people.
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc } }));
vi.mock("@/integrations/supabase/auth.server", () => {
  class UnauthorizedError extends Error {}
  return {
    UnauthorizedError,
    authenticateClerkRequest: vi.fn(async () => ({ userId: "user_abc", supabase: {} })),
  };
});

import { secretsMatch } from "../secure-compare.server";
import { transactionConfirmsPayment } from "../payment-verification";
import {
  RATE_LIMITS,
  RateLimitError,
  consumeInMemory,
  enforceRateLimit,
  resetDatabaseFallback,
  resetInMemoryLimits,
} from "../rate-limit.server";
import { MAX_BODY_BYTES, mobilePost } from "../mobile-api.server";
import { ACCOUNT_ID_PATTERN } from "@/integrations/clerk/deprovisioning.server";
import { z } from "zod";

beforeEach(() => {
  rpc.mockReset();
  resetInMemoryLimits();
  resetDatabaseFallback();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("secretsMatch", () => {
  it("accepts only the exact secret", () => {
    expect(secretsMatch("Bearer s3cret", "Bearer s3cret")).toBe(true);
    expect(secretsMatch("Bearer s3cre", "Bearer s3cret")).toBe(false);
    expect(secretsMatch("Bearer s3cret ", "Bearer s3cret")).toBe(false);
  });

  it("fails closed when either side is missing", () => {
    expect(secretsMatch(null, "x")).toBe(false);
    expect(secretsMatch("x", undefined)).toBe(false);
    expect(secretsMatch("", "")).toBe(false);
  });
});

describe("transactionConfirmsPayment", () => {
  const payment = {
    id: "pay_1",
    amount: "50000.00",
    currency: "UGX",
    pesapal_merchant_reference: null,
  };
  const ok = {
    status: "completed" as const,
    amount: 50000,
    currency: "UGX",
    merchantReference: "pay_1",
  };

  it("confirms Pesapal's completed order for the same reference, amount and currency", () => {
    expect(transactionConfirmsPayment(ok, payment)).toBe(true);
    expect(transactionConfirmsPayment({ ...ok, currency: "ugx" }, payment)).toBe(true);
  });

  it.each([
    ["not completed", { status: "pending" as const }],
    ["a different payment's order", { merchantReference: "pay_2" }],
    ["no reference at all", { merchantReference: null }],
    ["a smaller amount", { amount: 500 }],
    ["no amount", { amount: null }],
    ["another currency", { currency: "KES" }],
  ])("rejects %s", (_label, change) => {
    expect(transactionConfirmsPayment({ ...ok, ...change }, payment)).toBe(false);
  });

  it("uses the stored merchant reference when Pesapal assigned one", () => {
    const stored = { ...payment, pesapal_merchant_reference: "ref_9" };
    expect(transactionConfirmsPayment({ ...ok, merchantReference: "ref_9" }, stored)).toBe(true);
    expect(transactionConfirmsPayment(ok, stored)).toBe(false);
  });
});

describe("rate limiting", () => {
  it("counts per window and reopens when the window ends", () => {
    const rule = { limit: 2, windowSeconds: 60 };
    expect(consumeInMemory("k", rule, 0).allowed).toBe(true);
    expect(consumeInMemory("k", rule, 1).allowed).toBe(true);
    const third = consumeInMemory("k", rule, 2);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBe(60);
    expect(consumeInMemory("k", rule, 60_000).allowed).toBe(true);
  });

  it("keeps people's counts separate", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "function not found" } });
    for (let i = 0; i < RATE_LIMITS.account.limit; i++) await enforceRateLimit("account", "user_a");
    await expect(enforceRateLimit("account", "user_a")).rejects.toBeInstanceOf(RateLimitError);
    await expect(enforceRateLimit("account", "user_b")).resolves.toBeUndefined();
  });

  it("uses the shared database count when it is available", async () => {
    rpc.mockResolvedValue({ data: [{ allowed: false, retry_after_seconds: 42 }], error: null });
    const error = await enforceRateLimit("assistant", "user_a").catch((e) => e);
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.retryAfterSeconds).toBe(42);
    expect(rpc).toHaveBeenCalledWith("consume_rate_limit", {
      p_key: "assistant:user_a",
      p_limit: RATE_LIMITS.assistant.limit,
      p_window_seconds: RATE_LIMITS.assistant.windowSeconds,
    });
  });

  it("falls back to counting in memory, and stops retrying the database for a while", async () => {
    rpc.mockRejectedValue(new Error("ECONNRESET"));
    await expect(enforceRateLimit("uploads", "user_a")).resolves.toBeUndefined();
    await expect(enforceRateLimit("uploads", "user_a")).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});

describe("mobilePost", () => {
  const handler = mobilePost(z.object({ text: z.string().max(10) }), async (_ctx, body) => body, {
    rateLimit: "account",
  });
  const post = (body: string, headers: Record<string, string> = {}) =>
    handler({
      request: new Request("https://x.test/api/mobile/t", { method: "POST", body, headers }),
    });

  beforeEach(() => rpc.mockResolvedValue({ data: null, error: { message: "not applied" } }));

  it("answers a valid request", async () => {
    const res = await post(JSON.stringify({ text: "hi" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "hi" });
  });

  it("refuses an oversized body before parsing it (413)", async () => {
    const res = await post(JSON.stringify({ text: "a".repeat(MAX_BODY_BYTES) }));
    expect(res.status).toBe(413);
  });

  it("refuses a body that only claims to be huge (413)", async () => {
    const res = await post("{}", { "content-length": String(MAX_BODY_BYTES + 1) });
    expect(res.status).toBe(413);
  });

  it("rejects invalid input with the validation message (400)", async () => {
    const res = await post(JSON.stringify({ text: "far too long here" }));
    expect(res.status).toBe(400);
  });

  it("answers 429 with Retry-After once over the limit", async () => {
    for (let i = 0; i < RATE_LIMITS.account.limit; i++) await post(JSON.stringify({ text: "x" }));
    const res = await post(JSON.stringify({ text: "x" }));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

describe("account ids accepted for deletion", () => {
  it.each(["user_2abcDEF123", "5f0c7d2e-1b2a-4c3d-8e9f-0a1b2c3d4e5f"])("accepts %s", (id) => {
    expect(ACCOUNT_ID_PATTERN.test(id)).toBe(true);
  });

  // Each of these would change the meaning of the PostgREST filter the id is written into.
  it.each(["", "user_a,blocker_id.neq.null", "user_a)", "*", "user_a.or(x)", "user_ a"])(
    "rejects %j",
    (id) => {
      expect(ACCOUNT_ID_PATTERN.test(id)).toBe(false);
    },
  );
});
