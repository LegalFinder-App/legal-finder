// Server-only. Request authentication shared by requireClerkAuth (server functions) and the
// /api/mobile/* routes. Kept out of auth-middleware.ts so import protection can see that
// provisioning.server never reaches the client bundle.
import { auth } from "@clerk/tanstack-react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { AppDatabase } from "./app-database";
import { ensureProfileProvisioned } from "@/integrations/clerk/provisioning.server";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export class UnauthorizedError extends Error {}

/**
 * Verifies the Clerk session on the current request (browser cookie, or the Authorization bearer
 * token the mobile app sends) and returns an RLS-scoped Supabase client for that user. Shared by
 * requireClerkAuth (server functions) and the /api/mobile/* routes, so both authenticate
 * identically.
 */
export async function authenticateClerkRequest() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY before starting the server.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  const authObject = await auth();
  if (!authObject.isAuthenticated) {
    throw new UnauthorizedError("Unauthorized: No active Clerk session");
  }

  const token = await authObject.getToken();
  if (!token) {
    throw new UnauthorizedError("Unauthorized: Could not obtain a session token");
  }

  // Supabase's Clerk third-party auth integration verifies this token directly (via Clerk's
  // JWKS) and derives auth.jwt()->>'sub' from it for RLS — no separate Supabase-side claims
  // check needed, unlike the old Supabase-Auth getClaims() call this replaces.
  const supabase = createClient<AppDatabase>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  await ensureProfileProvisioned(authObject.userId);

  return { supabase, userId: authObject.userId };
}
