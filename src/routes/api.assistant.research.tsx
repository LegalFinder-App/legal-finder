import { createFileRoute } from "@tanstack/react-router";
import { researchRequestSchema } from "@/lib/assistant.functions";
import { DEFAULT_RESEARCH_FILTERS } from "@/lib/assistant-sources";

/**
 * Authenticated Legal Research search over advice, judgments and library items.
 * Returns real LegalFinder rows only — never fabricated authorities.
 */
export const Route = createFileRoute("/api/assistant/research")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { UnauthorizedError, authenticateClerkRequest } =
          await import("@/integrations/supabase/auth.server");
        const { RateLimitError, enforceRateLimit } = await import("@/lib/rate-limit.server");
        const { searchLegalResearch } = await import("@/lib/assistant-sources.server");
        const { ZodError } = await import("zod");

        try {
          const { userId } = await authenticateClerkRequest(request);
          await enforceRateLimit("assistant", userId);

          const raw = await request.json().catch(() => null);
          const body = researchRequestSchema.parse(raw ?? {});
          const result = await searchLegalResearch(
            body.query ?? "",
            {
              kinds: body.kinds?.length ? body.kinds : DEFAULT_RESEARCH_FILTERS.kinds,
              court: body.court ?? null,
              category: body.category ?? null,
              dateFrom: body.dateFrom ?? null,
              dateTo: body.dateTo ?? null,
            },
            body.limit ?? 24,
          );

          return Response.json(result);
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
          console.error(
            "[api/assistant/research]",
            error instanceof Error ? error.name : "error",
          );
          return Response.json(
            { error: "Research search is unavailable right now." },
            { status: 500 },
          );
        }
      },
    },
  },
});
