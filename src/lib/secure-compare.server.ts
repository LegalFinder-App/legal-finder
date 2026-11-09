// Server-only. Compares a secret sent by a caller (the cron job's bearer token, Flutterwave's
// webhook hash) with the configured one in constant time, so response timing can't be used to
// guess it a character at a time. Hashing first gives both sides the same length, which
// timingSafeEqual requires, without leaking the secret's length either.
import { createHash, timingSafeEqual } from "node:crypto";

export function secretsMatch(provided: string | null | undefined, expected: string | undefined) {
  if (!provided || !expected) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
