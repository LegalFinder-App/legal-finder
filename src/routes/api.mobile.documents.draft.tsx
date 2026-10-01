import { createFileRoute } from "@tanstack/react-router";
import { draftRequestSchema } from "@/lib/document-drafting.functions";

// AI-assisted drafting for the app's document generator (draftDocumentSection on the web).
export const Route = createFileRoute("/api/mobile/documents/draft")({
  server: {
    handlers: {
      POST: async (ctx) => {
        const { mobilePost } = await import("@/lib/mobile-api.server");
        const { draftDocument } = await import("@/lib/document-drafting.server");
        return mobilePost(draftRequestSchema, (_caller, body) => draftDocument(body))(ctx);
      },
    },
  },
});
