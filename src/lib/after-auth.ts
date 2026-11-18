import type { QueryClient } from "@tanstack/react-query";
import { checkClerkSession } from "@/lib/clerk-session.functions";
import { navigateAfterAuth } from "@/lib/rbac";
import { ROLE_HOME } from "@/lib/session";

export type AfterAuthDestination = (typeof ROLE_HOME)[keyof typeof ROLE_HOME];

export type AfterAuthNavigate = (opts: { to: AfterAuthDestination }) => void | Promise<void>;

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * Poll the server until Clerk's session cookie is visible. Client `isSignedIn` can flip on
 * before the cookie is readable by `auth()` — navigating to `/_authenticated` in that window
 * bounces the user straight back to `/auth` (account-created toast, then stuck on the form).
 */
export async function waitForServerSession(maxMs = 10_000): Promise<string | null> {
  const deadline = Date.now() + maxMs;
  let delay = 150;
  while (Date.now() < deadline) {
    try {
      const { userId } = await checkClerkSession();
      if (userId) return userId;
    } catch {
      // Provisioning / transport blip — keep trying until the deadline.
    }
    await sleep(delay);
    delay = Math.min(delay + 100, 600);
  }
  return null;
}

/**
 * Post-auth router used by /auth and /sso-callback: wait until the server sees the session,
 * resolve the role home, then navigate. Soft SPA nav is preferred once the cookie is confirmed;
 * pass a hard-nav `navigate` from the OAuth callback if you need a full document load.
 */
export async function continueAfterAuth(opts: {
  queryClient: QueryClient;
  userId: string;
  navigate: AfterAuthNavigate;
  warmSession?: boolean;
}): Promise<AfterAuthDestination> {
  const { queryClient, userId, navigate } = opts;

  const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T) =>
    Promise.race([
      promise,
      new Promise<T>((resolve) => window.setTimeout(() => resolve(fallback), ms)),
    ]);

  const serverUserId = await waitForServerSession(10_000);
  if (!serverUserId) {
    throw new Error(
      "Your account is ready, but this browser hasn't saved the sign-in cookie yet. Refresh the page, or try again in a moment.",
    );
  }

  const home = await withTimeout(
    navigateAfterAuth(queryClient, serverUserId || userId),
    8_000,
    "/dashboard",
  );
  await navigate({ to: home });
  return home;
}

/** Hard navigation — useful after OAuth when a full document load helps some browsers. */
export function hardNavigateTo(path: string) {
  window.location.assign(path);
}
