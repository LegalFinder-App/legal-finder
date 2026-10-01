// Server-only. The drafting call shared by the web's draftDocumentSection server function and the
// app's /api/mobile/documents/draft route, so both get the same prompt, model and error handling.
import type Anthropic from "@anthropic-ai/sdk";

export type DraftRequest = {
  documentType: string;
  instructions: string;
  caseContext?: string;
  existingText?: string;
};

const SYSTEM_PROMPT = `You are a legal-document drafting assistant embedded in LegalFinder, a Uganda-focused legal platform. You draft or revise plain-language first drafts of legal documents (retainer agreements, powers of attorney, simple service contracts, and similar) based on the user's instructions and any case context provided.

Rules:
- Produce only the document body text — no commentary, no markdown headers, no "here is your document" preamble. Plain prose and clearly labelled clauses/sections, formatted for direct insertion into a document template.
- Never fabricate statute numbers, case citations, or specific legal authority you're not certain of — write generically ("as required by applicable law") rather than inventing a citation.
- If existingText is provided, revise it according to the instructions rather than starting over, preserving parts not affected by the request.
- This is always a first draft for a licensed advocate to review before use — do not claim the output is final or legally binding.`;

/**
 * AI-assisted drafting for the document generator (see src/lib/documents/). Follows the pattern
 * established in assistant.server.ts: non-streaming (callers are RPC-style requests, not a raw
 * HTTP stream), Anthropic SDK imported dynamically.
 */
export async function draftDocument(data: DraftRequest): Promise<{ draftText: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "AI-assisted drafting isn't configured yet. Ask an administrator to set ANTHROPIC_API_KEY.",
    );
  }

  const { default: AnthropicClient } = await import("@anthropic-ai/sdk");
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  const client = new AnthropicClient({
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
    if (error instanceof AnthropicClient.AuthenticationError) {
      throw new Error("AI-assisted drafting is misconfigured (invalid API key).");
    }
    if (error instanceof AnthropicClient.RateLimitError) {
      throw new Error("Drafting is busy right now — please try again in a moment.");
    }
    if (error instanceof AnthropicClient.APIError) {
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
}
