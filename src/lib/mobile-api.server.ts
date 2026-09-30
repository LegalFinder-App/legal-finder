// Server-only. Plumbing for the /api/mobile/* routes the native app (apps/mobile) calls — the
// native counterparts of this app's server functions. The app sends its Clerk session token as a
// bearer header; clerkMiddleware (src/start.ts) verifies it exactly like a browser session cookie.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import type { AppDatabase } from "@/integrations/supabase/app-database";
import { UnauthorizedError, authenticateClerkRequest } from "@/integrations/supabase/auth.server";

export class BadRequestError extends Error {}

type Context = { request: Request; userId: string; supabase: SupabaseClient<AppDatabase> };

/** POST handler: authenticates, parses + validates the JSON body, returns JSON or { error }. */
export function mobilePost<TBody, TResult>(
  schema: ZodType<TBody> | null,
  run: (ctx: Context, body: TBody) => Promise<TResult>,
) {
  return async ({ request }: { request: Request }): Promise<Response> => {
    try {
      const { userId, supabase } = await authenticateClerkRequest();
      const raw = await request.json().catch(() => ({}));
      const body = schema ? schema.parse(raw) : (raw as TBody);
      const result = await run({ request, userId, supabase }, body);
      return Response.json(result ?? { ok: true });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return Response.json({ error: "Please sign in again." }, { status: 401 });
      }
      if (error instanceof ZodError || error instanceof BadRequestError) {
        const message =
          error instanceof ZodError
            ? (error.issues[0]?.message ?? "Invalid request.")
            : error.message;
        return Response.json({ error: message }, { status: 400 });
      }
      console.error("[mobile-api]", new URL(request.url).pathname, error);
      // Domain errors thrown on purpose (e.g. "This payment has already been completed.") are
      // written for users; anything unexpected gets a generic message instead of internals.
      const message =
        error instanceof Error && !/supabase|fetch|ECONN|undefined|null/i.test(error.message)
          ? error.message
          : "Something went wrong. Please try again.";
      return Response.json({ error: message }, { status: 500 });
    }
  };
}
