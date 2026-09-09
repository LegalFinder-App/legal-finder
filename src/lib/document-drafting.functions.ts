import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
// Type-only import — erased at compile time, so it does not pull the SDK into the client bundle.
import type Anthropic from "@anthropic-ai/sdk";
import { requireClerkAuth } from "@/integrations/supabase/auth-middleware";

const draftRequestSchema = z.object({
  documentType: z.string().min(1).max(100),
  instructions: z.string().min(1).max(4000),
  caseContext: z.string().max(2000).optional(),
  existingText: z.string().max(20000).optional(),
});

const SYSTEM_PROMPT = `You are a legal-document drafting assistant embedded in LegalFinder, a Uganda-focused legal platform. You draft or revise plain-language first drafts of legal documents (retainer agreements, powers of attorney, simple service contracts, and similar) based on the user's instructions and any case context provided.

Rules:
- Produce only the document body text — no commentary, no markdown headers, no "here is your document" preamble. Plain prose and clearly labelled clauses/sections, formatted for direct insertion into a document template.
- Never fabricate statute numbers, case citations, or specific legal authority you're not certain of — write generically ("as required by applicable law") rather than inventing a citation.
- If existingText is provided, revise it according to the instructions rather than starting over, preserving parts not affected by the request.
- This is always a first draft for a licensed advocate to review before use — do not claim the output is final or legally binding.`;

/**
 * AI-assisted drafting for the document generator (see src/lib/documents/). Follows the exact
 * pattern established in assistant.functions.ts: non-streaming (server functions here are RPC
 * calls, not a raw HTTP stream), Anthropic SDK imported dynamically inside the handler so it
 * never loads at module scope in the client bundle.
 */
export const draftDocumentSection = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .validator(draftRequestSchema)
  .handler(async ({ data }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "AI-assisted drafting isn't configured yet. Ask an administrator to set ANTHROPIC_API_KEY.",
      );
    }

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
    const client = new Anthropic({
      apiKey,
      defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
    });

    const userPrompt = [
      `Document type: ${data.documentType}`,
      data.caseContext ? `Case context: ${data.caseContext}` : null,
      data.existingText ? `Existing draft to revise:\n${data.existingText}` : null,
      `Instructions: ${data.instructions}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    let response;
    try {
      response = await client.messages.create({
        model: "claude-opus-5",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        output_config: { effort: "medium" },
        messages: [{ role: "user", content: userPrompt }],
      });
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        throw new Error("AI-assisted drafting is misconfigured (invalid API key).");
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new Error("Drafting is busy right now — please try again in a moment.");
      }
      if (error instanceof Anthropic.APIError) {
        throw new Error(`Drafting error: ${error.message}`);
      }
      throw error;
    }

    if (response.stop_reason === "refusal") {
      throw new Error("The assistant couldn't draft that. Try rephrasing your instructions.");
    }

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text",
    );

    if (!textBlock?.text) {
      throw new Error("No draft was returned — please try again.");
    }

    return { draftText: textBlock.text };
  });
