// Bridges Clerk (a React context) to code that runs outside React — the Supabase client's
// accessToken callback and the API client. AuthBridge in app/_layout.tsx registers the getter
// once ClerkProvider is mounted; until then (or when signed out) requests go out anonymous,
// which is exactly what the public, RLS-open tables expect.

type TokenGetter = () => Promise<string | null>;

let getter: TokenGetter | null = null;

export function registerTokenGetter(fn: TokenGetter | null) {
  getter = fn;
}

export async function getAuthToken(): Promise<string | null> {
  if (!getter) return null;
  try {
    return await getter();
  } catch {
    return null;
  }
}
