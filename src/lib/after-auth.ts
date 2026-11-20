import type { QueryClient } from "@tanstack/react-query";
import { checkClerkSession } from "@/lib/clerk-session.functions";
import { markAuthHandoff } from "@/lib/auth-handoff";
import { navigateAfterAuth } from "@/lib/rbac";
import { ROLE_HOME } from "@/lib/session";

export type AfterAuthDestination = (typeof ROLE_HOME)[keyof typeof ROLE_HOME];

export type AfterAuthNavigate = (opts: { to: AfterAuthDestination }) => void | Promise<void>;

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** Clerk user id from the browser SDK (set right after finalize, even if the cookie lags). */
export function clientClerkUserId(): string | null {
  if (typeof window === "undefined") return null;
  const clerk = window.Clerk;
  return clerk?.user?.id ?? clerk?.session?.user?.id ?? null;
}

/** Clerk errors when the browser already has an active session and you try to sign in again. */
export function isAlreadySignedInError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  const code =
    err && typeof err === "object" && "errors" in err
      ? JSON.stringify((err as { errors?: unknown }).errors)
      : "";
  const haystack = `${message} ${code}`.toLowerCase();
  return (
    haystack.includes("already signed in") ||
    haystack.includes("already logged in") ||
    haystack.includes("session_exists") ||
    haystack.includes("identifier_already_signed_in") ||
    haystack.includes("you're already signed in")
  );
}

/** One RPC with a hard cap — a hung serverFn must not freeze /opening forever. */
async function checkClerkSessionOnce(timeoutMs: number): Promise<string | null> {
  try {
    const result = await Promise.race([
      checkClerkSession(),
      sleep(timeoutMs).then(() => null),
    ]);
    return result?.userId ?? null;
  } catch {
    return null;
  }
}

/** Block until the Clerk cookie is visible server-side (or timeout). */
export async function waitForServerSession(maxMs = 8_000): Promise<string | null> {
  const deadline = Date.now() + maxMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const userId = await checkClerkSessionOnce(Math.min(2_500, remaining));
    if (userId) return userId;
    await sleep(120 + Math.min(attempt, 10) * 40);
    attempt++;
  }
  return null;
}

/** Background-only: provision profile / sync cookie. Never block leaving /auth on this. */
export function warmServerSessionInBackground() {
  void waitForServerSession(6_000);
}

async function resolveHome(queryClient: QueryClient, userId: string): Promise<AfterAuthDestination> {
  void queryClient.invalidateQueries({ queryKey: ["roles", userId] });
  void queryClient.invalidateQueries({ queryKey: ["profile", userId] });
  return Promise.race([
    navigateAfterAuth(queryClient, userId).catch(() => "/dashboard" as AfterAuthDestination),
    new Promise<AfterAuthDestination>((resolve) =>
      window.setTimeout(() => resolve("/dashboard"), 800),
    ),
  ]);
}

/**
 * Soft-navigate to the role home. Safe for email/password once Clerk is already live in this
 * SPA tab. Prefer `finishAuthWithHardNav` after OAuth — soft-nav races the cookie and bounces
 * through /auth.
 */
export async function continueAfterAuth(opts: {
  queryClient: QueryClient;
  userId: string;
  navigate: AfterAuthNavigate;
}): Promise<AfterAuthDestination> {
  const { queryClient, userId, navigate } = opts;
  warmServerSessionInBackground();
  const home = await resolveHome(queryClient, userId);
  await navigate({ to: home });
  return home;
}

/**
 * OAuth / SSO exit: wait until the session cookie works, then one hard navigation to the
 * workspace. Staying on /sso-callback (or AuthHandoff) until then avoids the
 * callback → /auth form → dashboard flash.
 */
export async function finishAuthWithHardNav(opts: {
  queryClient: QueryClient;
  userId: string;
}): Promise<AfterAuthDestination> {
  markAuthHandoff();
  const { queryClient, userId } = opts;
  // Do not block on the cookie — hard-nav immediately. `_authenticated` resolves Clerk on load.
  void waitForServerSession(4_000);
  const id = userId || clientClerkUserId();
  if (!id) {
    throw new Error("No session id to open workspace");
  }
  const home = await resolveHome(queryClient, id);
  markAuthHandoff();
  window.location.replace(home);
  return home;
}

/** Full document navigation — last resort paths (e.g. true OTP hand-off to /auth). */
export function hardNavigateTo(path: string) {
  window.location.assign(path);
}
