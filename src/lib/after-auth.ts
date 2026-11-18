import type { QueryClient } from "@tanstack/react-query";
import { checkClerkSession } from "@/lib/clerk-session.functions";
import { navigateAfterAuth } from "@/lib/rbac";
import { ROLE_HOME } from "@/lib/session";

export type AfterAuthDestination = (typeof ROLE_HOME)[keyof typeof ROLE_HOME];

export type AfterAuthNavigate = (opts: { to: AfterAuthDestination }) => void | Promise<void>;

/**
 * Post-auth router used by /auth and /sso-callback: resolve the role home and optionally warm
 * the server session check so `_authenticated` beforeLoad is fast.
 */
export async function continueAfterAuth(opts: {
  queryClient: QueryClient;
  userId: string;
  navigate: AfterAuthNavigate;
  warmSession?: boolean;
}): Promise<AfterAuthDestination> {
  const { queryClient, userId, navigate, warmSession = true } = opts;

  const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T) =>
    Promise.race([
      promise,
      new Promise<T>((resolve) => window.setTimeout(() => resolve(fallback), ms)),
    ]);

  const homePromise = withTimeout(navigateAfterAuth(queryClient, userId), 10_000, "/dashboard");
  const warmPromise = warmSession
    ? withTimeout(checkClerkSession().catch(() => null), 6_000, null)
    : Promise.resolve(null);
  const [home] = await Promise.all([homePromise, warmPromise]);
  await navigate({ to: home });
  return home;
}

/** Hard navigation — more reliable across Safari/Chrome after OAuth cookie hand-off. */
export function hardNavigateTo(path: string) {
  window.location.assign(path);
}
