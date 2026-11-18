/**
 * Browser Clerk session JWT for /api/* calls. Prefer the React `useAuth().getToken` bridge
 * (registered from the root once ClerkProvider is mounted) — `window.Clerk.session.getToken()`
 * alone often returns null even while the UI shows a signed-in user, which made Counsellor AI
 * throw "Please sign in again" before the request left the browser.
 */

type TokenGetter = () => Promise<string | null | undefined>;

let authTokenGetter: TokenGetter | null = null;

/** Called from the root while signed in; pass null when signed out. */
export function registerClerkBrowserTokenGetter(getter: TokenGetter | null) {
  authTokenGetter = getter;
}

async function waitForClerk(timeoutMs = 8_000): Promise<Window["Clerk"] | undefined> {
  if (typeof window === "undefined") return undefined;
  const start = Date.now();
  while (!window.Clerk && Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (window.Clerk && !window.Clerk.loaded) {
    await window.Clerk.load().catch(() => undefined);
  }
  return window.Clerk;
}

async function tokenFromWindowClerk(): Promise<string | null> {
  const clerk = await waitForClerk();
  for (let attempt = 0; attempt < 10; attempt++) {
    const session = clerk?.session;
    if (!session) {
      await new Promise((resolve) => setTimeout(resolve, 100));
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
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const token = (await authTokenGetter()) ?? null;
        if (token) return token;
      } catch {
        // Getter not ready yet.
      }
      await new Promise((resolve) => setTimeout(resolve, 100 + attempt * 50));
    }
  }

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
