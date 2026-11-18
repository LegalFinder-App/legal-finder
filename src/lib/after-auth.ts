import type { QueryClient } from "@tanstack/react-query";
import { checkClerkSession } from "@/lib/clerk-session.functions";
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

/**
 * Best-effort: warm the server session / profile provision. Do not block the UI on this —
 * client `isSignedIn` is enough to enter the workspace; Supabase uses `getToken()` from the
 * browser SDK, not the cookie gate.
 */
export async function warmServerSession(maxMs = 2_500): Promise<string | null> {
  const deadline = Date.now() + maxMs;
  let delay = 120;
  while (Date.now() < deadline) {
    try {
      const { userId } = await checkClerkSession();
      if (userId) return userId;
    } catch {
      // ignore — cookie / provision may still be catching up
    }
    await sleep(delay);
    delay = Math.min(delay + 80, 400);
  }
  return null;
}

/**
 * Leave /auth for the role home as soon as we have a user id. Briefly tries to warm the
 * server cookie; navigates either way so a cookie lag cannot trap a signed-in user on /auth.
 */
export async function continueAfterAuth(opts: {
  queryClient: QueryClient;
  userId: string;
  navigate: AfterAuthNavigate;
}): Promise<AfterAuthDestination> {
  const { queryClient, userId, navigate } = opts;

  const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T) =>
    Promise.race([
      promise,
      new Promise<T>((resolve) => window.setTimeout(() => resolve(fallback), ms)),
    ]);

  // Kick provisioning / cookie visibility, but never block leaving /auth on it.
  const serverUserId = await warmServerSession(2_500);
  const resolvedId = serverUserId ?? userId;

  const home = await withTimeout(
    navigateAfterAuth(queryClient, resolvedId).catch(() => "/dashboard" as AfterAuthDestination),
    6_000,
    "/dashboard",
  );
  await navigate({ to: home });
  // Keep warming in the background so the next full page load sees the cookie.
  if (!serverUserId) void warmServerSession(8_000);
  return home;
}

/** Hard navigation — useful after OAuth when a full document load helps some browsers. */
export function hardNavigateTo(path: string) {
  window.location.assign(path);
}
