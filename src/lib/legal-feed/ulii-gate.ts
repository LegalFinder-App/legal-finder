/**
 * ULII access gate — pure, testable. Scraping is never allowed.
 * Even with ULII_ENABLED=true, fetches stay off until an API contract is implemented
 * (see docs/ULII_ACCESS_REQUEST.md and docs/SOURCES.md).
 */

export type UliiGateEnv = {
  ULII_ENABLED?: string;
  ULII_API_BASE?: string;
  ULII_API_TOKEN?: string;
};

export type UliiGateResult =
  | { ok: true }
  | { ok: false; reason: string; allowFetch: false };

/**
 * Returns whether any network call to ULII is permitted.
 * Today `ok: true` never happens — contract not implemented — so allowFetch is always false.
 */
export function evaluateUliiGate(env: UliiGateEnv = process.env): UliiGateResult {
  if (env.ULII_ENABLED !== "true") {
    return { ok: false, reason: "disabled (ULII_ENABLED is not true)", allowFetch: false };
  }
  if (!env.ULII_API_BASE?.trim() || !env.ULII_API_TOKEN?.trim()) {
    return { ok: false, reason: "missing ULII_API_BASE/ULII_API_TOKEN", allowFetch: false };
  }
  // Credentials alone are not enough: the licensed client must be coded against ULII's contract.
  return { ok: false, reason: "awaiting ULII API contract", allowFetch: false };
}

/** True only when a future licensed client may perform HTTPS calls to ULII's API. */
export function uliiFetchAllowed(env: UliiGateEnv = process.env): boolean {
  const result = evaluateUliiGate(env);
  return result.ok === true;
}
