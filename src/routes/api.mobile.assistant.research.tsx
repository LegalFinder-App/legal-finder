import { createFileRoute } from "@tanstack/react-router";
import { researchRequestSchema } from "@/lib/assistant.functions";
import { DEFAULT_RESEARCH_FILTERS } from "@/lib/assistant-sources";

/**
 * Native/desktop counterpart of /api/assistant/research — same FTS + keyword merge, Bearer auth.
 */
export const Route = createFileRoute("/api/mobile/assistant/research")({
  server: {
    handlers: {
      POST: async (ctx) => {
        const { mobilePost } = await import("@/lib/mobile-api.server");
        const { searchLegalResearch } = await import("@/lib/assistant-sources.server");
        return mobilePost(
          researchRequestSchema,
          async (_auth, body) =>
            searchLegalResearch(
              body.query ?? "",
              {
                kinds: body.kinds?.length ? body.kinds : DEFAULT_RESEARCH_FILTERS.kinds,
                court: body.court ?? null,
                category: body.category ?? null,
                dateFrom: body.dateFrom ?? null,
                dateTo: body.dateTo ?? null,
              },
              body.limit ?? 24,
            ),
          { rateLimit: "assistant" },
        )(ctx);
      },
    },
  },
});
