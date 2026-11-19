/** sessionStorage flag so /auth can show the finishing screen instead of the sign-in form
 *  if OAuth briefly lands there before the workspace route accepts the session. */
const KEY = "lf:auth-handoff";
const MAX_AGE_MS = 90_000;

export function markAuthHandoff() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    // private mode / quota
  }
}

/** True if SSO (or another flow) just handed off — do not show the sign-in form. */
export function hasAuthHandoff(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return false;
    const started = Number(raw);
    if (!Number.isFinite(started) || Date.now() - started > MAX_AGE_MS) {
      sessionStorage.removeItem(KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function clearAuthHandoff() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
