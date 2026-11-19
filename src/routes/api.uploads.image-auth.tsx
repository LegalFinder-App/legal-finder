import { createFileRoute } from "@tanstack/react-router";
import { uploadRequestSchema } from "@/lib/imagekit.functions";

/**
 * Web ImageKit upload signature. Same logic as /api/mobile/uploads/image-auth, but for the
 * browser: authenticateClerkRequest(request) accepts cookie + Bearer so Attach works when the
 * UI is signed in and the session cookie has not caught up yet.
 */
export const Route = createFileRoute("/api/uploads/image-auth")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { UnauthorizedError, authenticateClerkRequest } =
          await import("@/integrations/supabase/auth.server");
        const { RateLimitError, enforceRateLimit } = await import("@/lib/rate-limit.server");
        const { createImageKitUploadAuth } = await import("@/lib/imagekit.server");
        const { ZodError } = await import("zod");

        try {
          const { userId, supabase } = await authenticateClerkRequest(request);
          await enforceRateLimit("uploads", userId);

          const raw = await request.json().catch(() => null);
          const body = uploadRequestSchema.parse(raw);

          const auth = await createImageKitUploadAuth({
            supabase,
            userId,
            extension: body.extension,
            purpose: body.purpose ?? "profile",
          });
          return Response.json(auth);
        } catch (error) {
          if (error instanceof UnauthorizedError) {
            return Response.json({ error: "Please sign in again." }, { status: 401 });
          }
          if (error instanceof RateLimitError) {
            return Response.json(
              { error: error.message },
              { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
            );
          }
          if (error instanceof ZodError) {
            return Response.json(
              { error: error.issues[0]?.message ?? "Invalid request." },
              { status: 400 },
            );
          }
          console.error("[api/uploads/image-auth]", error instanceof Error ? error.name : "error");
          const message =
            error instanceof Error && !/supabase|fetch|ECONN|undefined|null|token|jwt/i.test(error.message)
              ? error.message
              : "Something went wrong. Please try again.";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
