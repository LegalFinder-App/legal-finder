import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireClerkAuth } from "@/integrations/supabase/auth-middleware";

// Also used by /api/mobile/documents/draft to validate the app's requests identically.
export const draftRequestSchema = z.object({
  documentType: z.string().min(1).max(100),
  instructions: z.string().min(1).max(4000),
  caseContext: z.string().max(2000).optional(),
  existingText: z.string().max(20000).optional(),
});

/**
 * AI-assisted drafting for the document generator (see src/lib/documents/). The Anthropic call
 * lives in document-drafting.server.ts (dynamically imported — route/functions files are
 * dual-purpose, so server-only deps must not load at module scope).
 */
export const draftDocumentSection = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .validator(draftRequestSchema)
  .handler(async ({ data }) => {
    const { draftDocument } = await import("@/lib/document-drafting.server");
    return draftDocument(data);
  });
