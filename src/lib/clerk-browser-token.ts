/**
 * Browser Clerk session JWT for /api/* calls. Prefer the React `useAuth().getToken` bridge
 * (registered from the root once ClerkProvider is mounted) — `window.Clerk.session.getToken()`
 * alone often returns null even while the UI shows a signed-in user, which made Counsellor AI
 * throw "Please sign in again" / "No active Clerk session" before the request left the browser.
 */

import { waitForWindowClerk } from "@/lib/clerk-load";

type TokenGetter = () => Promise<string | null | undefined>;

let authTokenGetter: TokenGetter | null = null;

/** Called from the root while signed in; pass null when signed out. */
export function registerClerkBrowserTokenGetter(getter: TokenGetter | null) {
  authTokenGetter = getter;
}

/**
 * One quick try of the React bridge — for high-frequency callers (Supabase accessToken).
 * Does not retry or fall back to window.Clerk.
 */
export async function getRegisteredClerkBrowserToken(): Promise<string | null> {
  if (!authTokenGetter) return null;
  try {
    return (await authTokenGetter()) ?? null;
  } catch {
    return null;
  }
}

async function tokenFromWindowClerk(): Promise<string | null> {
  const clerk = await waitForWindowClerk(6_000);
  for (let attempt = 0; attempt < 12; attempt++) {
    const session = clerk?.session;
    if (!session) {
      await new Promise((resolve) => setTimeout(resolve, 100 + attempt * 40));
      continue;
    }
    try {
      const token =
        (await session.getToken({ skipCache: attempt > 0 })) ?? (await session.getToken()) ?? null;
      if (token) return token;
    } catch {
      // Session still hydrating.
    }
    await new Promise((resolve) => setTimeout(resolve, 120 + attempt * 40));
  }
  return null;
}

export async function getClerkSessionToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  if (authTokenGetter) {
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const token = (await authTokenGetter()) ?? null;
        if (token) return token;
      } catch {
        // Getter not ready yet.
      }
      await new Promise((resolve) => setTimeout(resolve, 80 + attempt * 40));
    }
  }

  // Always fall through — the React bridge can lag while window.Clerk already has a session.
  return tokenFromWindowClerk();
}

/** Headers for authenticated browser fetches to /api/* (Bearer when available + cookies). */
export async function clerkApiHeaders(
  extra: Record<string, string> = {},
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extra };
  const token = await getClerkSessionToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Like clerkApiHeaders, but waits until a Bearer JWT is available (or throws a soft sign-in
 * message). Prefer this for Counsellor / AI consent so we never fire a cookie-only POST that
 * 401s and looks like a dead Clerk session.
 */
export async function requireClerkApiHeaders(
  extra: Record<string, string> = {},
): Promise<Record<string, string>> {
  const headers = await clerkApiHeaders(extra);
  if (headers.Authorization) return headers;

  // One more hard refresh pass before giving up.
  await new Promise((resolve) => setTimeout(resolve, 300));
  const again = await clerkApiHeaders(extra);
  if (again.Authorization) return again;

  throw new Error("Please sign in again to continue.");
}
