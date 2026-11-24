import { toast } from "@/lib/toast";
import { checkClerkSession } from "@/lib/clerk-session.functions";
import { getClerkSessionToken } from "@/lib/clerk-browser-token";
import {
  clearAllCounsellorData,
  clearCounsellorDataForUser,
} from "@/components/app/counsellor/storage";

const CHECK_INTERVAL_MS = 60_000;
const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

let recovering = false;

function clientLooksSignedIn(): boolean {
  if (typeof window === "undefined") return false;
  const clerk = window.Clerk;
  return Boolean(clerk?.user?.id || clerk?.session?.user?.id || clerk?.session?.status === "active");
}

/**
 * When the UI still looks signed in but neither a Bearer JWT nor the cookie session can be
 * proven, force a clean sign-out so Attach/chat stop failing with cryptic Clerk errors.
 */
export async function recoverExpiredSession(opts: {
  userId?: string | null;
  signOut: () => Promise<unknown>;
  navigateToAuth: () => void | Promise<void>;
  reason?: string;
}): Promise<boolean> {
  if (recovering) return true;
  recovering = true;
  try {
    if (opts.userId) clearCounsellorDataForUser(opts.userId);
    else clearAllCounsellorData();
    toast.error(opts.reason ?? "Please sign in again.", {
      description: "Your session ended. Sign in to continue.",
    });
    try {
      await opts.signOut();
    } catch {
      // Already gone.
    }
    await opts.navigateToAuth();
    return true;
  } finally {
    window.setTimeout(() => {
      recovering = false;
    }, 2_000);
  }
}

/** True when session is still usable (token or cookie). */
export async function probeClerkSessionAlive(): Promise<boolean> {
  if (typeof window !== "undefined" && window.Clerk && !window.Clerk.loaded) {
    // Still booting — treat as alive so we don't false-eject.
    return true;
  }

  const token = await getClerkSessionToken();
  if (token) return true;

  try {
    const { userId } = await checkClerkSession();
    if (userId) return true;
  } catch {
    // keep probing
  }

  if (clientLooksSignedIn()) {
    await sleep(400);
    const again = await getClerkSessionToken();
    if (again) return true;
    try {
      const { userId } = await checkClerkSession();
      if (userId) return true;
    } catch {
      // dead
    }
    return false;
  }

  // No client session and no cookie — expired / signed out.
  return false;
}

/**
 * Poll + focus/visibility checks. Call from the authenticated layout.
 * Returns a cleanup function.
 */
export function startSessionWatchdog(opts: {
  userId: string;
  signOut: () => Promise<unknown>;
  navigateToAuth: () => void | Promise<void>;
}): () => void {
  let cancelled = false;

  const run = async () => {
    if (cancelled || recovering) return;
    const alive = await probeClerkSessionAlive();
    if (cancelled || recovering) return;
    if (!alive) {
      await recoverExpiredSession({
        userId: opts.userId,
        signOut: opts.signOut,
        navigateToAuth: opts.navigateToAuth,
      });
    }
  };

  const onVisible = () => {
    if (document.visibilityState === "visible") void run();
  };
  const onFocus = () => void run();

  const interval = window.setInterval(() => void run(), CHECK_INTERVAL_MS);
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onFocus);
  // First check after a short delay so soft-nav after sign-in isn't raced.
  const initial = window.setTimeout(() => void run(), 8_000);

  return () => {
    cancelled = true;
    window.clearInterval(interval);
    window.clearTimeout(initial);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onFocus);
  };
}

/** Map API/upload errors that mean the session is dead into recovery. */
export function isSessionExpiredError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  // Do not match bare "unauthorized" — consent / RLS / rate-limit messages must not force logout.
  return /please sign in again|no active clerk session|unauthorized:\s*no active/i.test(message);
}

/**
 * Only force sign-out when the JWT (and cookie probe) are truly gone — a single 401 during
 * hydrate must not eject a signed-in user from Counsellor AI.
 */
export async function recoverIfSessionTrulyDead(opts: {
  userId?: string | null;
  signOut: () => Promise<unknown>;
  navigateToAuth: () => void | Promise<void>;
  reason?: string;
  softMessage?: string;
}): Promise<boolean> {
  const alive = await probeClerkSessionAlive();
  if (alive) {
    toast.error(opts.softMessage ?? "Counsellor AI couldn't complete that request.", {
      description: "Your session looks fine — please try again.",
    });
    return false;
  }
  return recoverExpiredSession(opts);
}
