import type { QueryClient } from "@tanstack/react-query";
import { checkClerkSession } from "@/lib/clerk-session.functions";
import { navigateAfterAuth } from "@/lib/rbac";
import { ROLE_HOME } from "@/lib/session";

export type AfterAuthSession = {
  status?: string | null;
  currentTask?: { key?: string } | null;
  user?: { id?: string } | null;
} | null;

export type AfterAuthDestination =
  | "/session-tasks/setup-mfa"
  | (typeof ROLE_HOME)[keyof typeof ROLE_HOME];

export type AfterAuthNavigate = (opts: { to: AfterAuthDestination }) => void | Promise<void>;

/**
 * Single post-auth router used by /auth, /sso-callback and MFA setup complete:
 * pending setup-mfa → MFA page; otherwise role home (with a warmed checkClerkSession).
 */
export async function continueAfterAuth(opts: {
  queryClient: QueryClient;
  userId: string;
  session?: AfterAuthSession;
  navigate: AfterAuthNavigate;
  warmSession?: boolean;
}): Promise<void> {
  const { queryClient, userId, session, navigate, warmSession = true } = opts;

  if (session?.status === "pending" && session.currentTask?.key === "setup-mfa") {
    await navigate({ to: "/session-tasks/setup-mfa" });
    return;
  }

  // Roles + session warm can stall if the Clerk token isn't ready yet — fail fast to /dashboard
  // rather than leave the auth button spinning forever.
  const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T) =>
    Promise.race([
      promise,
      new Promise<T>((resolve) => window.setTimeout(() => resolve(fallback), ms)),
    ]);

  const homePromise = withTimeout(navigateAfterAuth(queryClient, userId), 12_000, "/dashboard");
  const warmPromise = warmSession
    ? withTimeout(checkClerkSession().catch(() => null), 8_000, null)
    : Promise.resolve(null);
  const [home] = await Promise.all([homePromise, warmPromise]);
  await navigate({ to: home });
}
