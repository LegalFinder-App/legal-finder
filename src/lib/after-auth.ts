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

/** Background-only: provision profile / sync cookie. Never block leaving /auth on this. */
export function warmServerSessionInBackground() {
  void (async () => {
    for (let i = 0; i < 12; i++) {
      try {
        const { userId } = await checkClerkSession();
        if (userId) return;
      } catch {
        // keep trying
      }
      await sleep(250 + i * 100);
    }
  })();
}

/**
 * Soft-navigate to the role home. Soft SPA nav keeps the in-memory Clerk session (navbar +
 * workspace). Hard-nav was wiping that session when the cookie lagged, which left people
 * "already signed in" to Clerk but stuck on marketing Sign in buttons.
 */
export async function continueAfterAuth(opts: {
  queryClient: QueryClient;
  userId: string;
  navigate: AfterAuthNavigate;
}): Promise<AfterAuthDestination> {
  const { queryClient, userId, navigate } = opts;

  warmServerSessionInBackground();
  void queryClient.invalidateQueries({ queryKey: ["roles", userId] });
  void queryClient.invalidateQueries({ queryKey: ["profile", userId] });

  const home = await Promise.race([
    navigateAfterAuth(queryClient, userId).catch(() => "/dashboard" as AfterAuthDestination),
    new Promise<AfterAuthDestination>((resolve) =>
      window.setTimeout(() => resolve("/dashboard"), 800),
    ),
  ]);

  await navigate({ to: home });
  return home;
}

/** Full document navigation — OAuth callback only, after the provider round-trip. */
export function hardNavigateTo(path: string) {
  window.location.assign(path);
}
