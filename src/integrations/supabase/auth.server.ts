// Server-only. Request authentication shared by requireClerkAuth (server functions) and the
// /api/mobile/* + /api/assistant/* routes. Kept out of auth-middleware.ts so import protection
// can see that provisioning.server never reaches the client bundle.
import { createClerkClient, verifyToken } from "@clerk/backend";
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

function bearerFromRequest(request: Request | undefined): string | null {
  if (!request) return null;
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

/**
 * `@clerk/backend`'s public `verifyToken` is legacy-wrapped: it resolves to the JwtPayload
 * itself (and throws on failure), not `{ data, errors }`. Accept both shapes so a Bearer
 * session JWT always yields a user id.
 */
function userIdFromVerifiedToken(verified: unknown): string | null {
  if (!verified || typeof verified !== "object") return null;
  const record = verified as { sub?: unknown; data?: { sub?: unknown }; errors?: unknown };
  if (record.errors) return null;
  if (typeof record.sub === "string" && record.sub.length > 0) return record.sub;
  if (record.data && typeof record.data.sub === "string" && record.data.sub.length > 0) {
    return record.data.sub;
  }
  return null;
}

async function identityFromBearer(request: Request | undefined): Promise<{
  userId: string;
  token: string;
} | null> {
  const bearer = bearerFromRequest(request);
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!bearer || !secretKey) return null;

  try {
    const verified = await verifyToken(bearer, { secretKey });
    const sub = userIdFromVerifiedToken(verified);
    if (sub) return { userId: sub, token: bearer };
  } catch {
    // Invalid / expired JWT.
  }
  return null;
}

async function identityFromAuthenticateRequest(request: Request): Promise<{
  userId: string;
  token: string;
} | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey =
    process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!secretKey || !publishableKey) return null;

  try {
    const clerk = createClerkClient({ secretKey, publishableKey });
    const state = await clerk.authenticateRequest(request, {
      // Cookie + Authorization: Bearer session JWTs from the browser / mobile app.
      acceptsToken: "session_token",
    });
    if (!state.isAuthenticated || !state.token) return null;
    const sessionAuth = state.toAuth();
    const userId = sessionAuth.userId;
    if (!userId) return null;
    const token = state.token || (await sessionAuth.getToken()) || null;
    if (!token) return null;
    return { userId, token };
  } catch {
    return null;
  }
}

/**
 * Verifies the Clerk session on the current request (browser cookie, or the Authorization bearer
 * token the mobile app / web assistant send) and returns an RLS-scoped Supabase client for that
 * user. Shared by requireClerkAuth, /api/mobile/*, and /api/assistant/*.
 */
export async function authenticateClerkRequest(request?: Request) {
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

  let userId: string | null = null;
  let token: string | null = null;

  // 1) Prefer authenticating the concrete Request (cookies + Bearer) — API routes.
  if (request) {
    const fromRequest = await identityFromAuthenticateRequest(request);
    if (fromRequest) {
      userId = fromRequest.userId;
      token = fromRequest.token;
    }
  }

  // 2) TanStack Start / serverFn cookie context (no Request object passed).
  if (!userId || !token) {
    try {
      const authObject = await auth();
      if (authObject.isAuthenticated) {
        userId = userId ?? authObject.userId;
        token = token ?? (await authObject.getToken()) ?? null;
      }
    } catch {
      // Outside a Clerk request context.
    }
  }

  // 3) Explicit Bearer verify — covers cookie lag after sign-in when authenticateRequest
  // missed the header, and fixes the legacy verifyToken payload shape.
  if ((!userId || !token) && request) {
    const fromBearer = await identityFromBearer(request);
    if (fromBearer) {
      userId = fromBearer.userId;
      token = fromBearer.token;
    }
  }

  if (!userId || !token) {
    throw new UnauthorizedError("Unauthorized: No active Clerk session");
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

  await ensureProfileProvisioned(userId);

  return { supabase, userId };
}
