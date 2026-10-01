import { createFileRoute } from "@tanstack/react-router";

// The app's counterpart of the web's DocumentGenerator: fills a template (or wraps drafted text),
// renders the PDF and files it in the caller's document vault.
export const Route = createFileRoute("/api/mobile/documents/generate")({
  server: {
    handlers: {
      POST: async (ctx) => {
        const { mobilePost } = await import("@/lib/mobile-api.server");
        const { generateDocument, generateDocumentSchema } =
          await import("@/lib/documents/generate.server");
        return mobilePost(generateDocumentSchema, generateDocument)(ctx);
      },
    },
  },
});
