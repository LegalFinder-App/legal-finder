/**
 * Browser-only Clerk session JWT for API calls. Cookie sessions can lag after sign-in; the
 * mobile app already sends this as Authorization: Bearer, and the web assistant/research
 * routes need the same when `auth()` only sees cookies.
 */
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

export async function getClerkSessionToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const clerk = await waitForClerk();
  // Fresh finalize can leave session present a tick before getToken() is ready.
  for (let attempt = 0; attempt < 8; attempt++) {
    const token = (await clerk?.session?.getToken()) ?? null;
    if (token) return token;
    if (!clerk?.session) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}

/** Headers for authenticated browser fetches to /api/* (Bearer + cookies). */
export async function clerkApiHeaders(
  extra: Record<string, string> = {},
): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extra };
  const token = await getClerkSessionToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}
