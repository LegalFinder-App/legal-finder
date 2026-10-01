import { createFileRoute } from "@tanstack/react-router";

// The document templates the app can offer (title, description, form fields). Served rather than
// copied into the app so a template added on the web shows up in the apps without a release.
export const Route = createFileRoute("/api/mobile/documents/templates")({
  server: {
    handlers: {
      POST: async (ctx) => {
        const { mobilePost } = await import("@/lib/mobile-api.server");
        const { listDocumentTemplates } = await import("@/lib/documents/generate.server");
        return mobilePost(null, async () => listDocumentTemplates())(ctx);
      },
    },
  },
});
