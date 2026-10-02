// Server-only. The assistant call shared by the web's askAssistant server function and the mobile
// app's /api/mobile/assistant route, so both get the same prompt, model and error handling.
import type Anthropic from "@anthropic-ai/sdk";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are the LegalFinder Assistant, embedded in LegalFinder — a Uganda-focused platform connecting clients with verified advocates, court judgements, police services and plain-language legal guidance.

Ground rules:
- Give clear, practical, plain-language information about Ugandan law and legal processes. You are not a substitute for a licensed advocate and must not present yourself as one — for anything that requires representation, filing, or a binding opinion, direct the person to search the verified advocate directory at /lawyers or book a consultation.
- Keep answers concise (a few short paragraphs or a short list, not an essay) unless the person asks for more detail.
- When relevant, point to the right in-app destination: /lawyers (advocate directory), /advice (guides), /judgements (case law), /safety (security tips), /stations (police stations), /report (file an incident).
- If asked about anything outside Ugandan/general legal topics or this platform, briefly redirect back to what you can help with.
- Never fabricate case citations, statute numbers, or advocate names — if you're not certain, say so and point to the directory or advice hub instead of guessing.`;

/**
 * Non-streaming: server functions are RPC calls, not a raw HTTP stream, so low effort + a modest
 * max_tokens keeps this comfortably inside normal request timeouts.
 *
 * max_tokens covers the model's thinking as well as the answer (thinking is always on from
 * Claude Opus 5.5 and can't be switched off), so it is set with room for both; the system prompt
 * is what keeps answers short. A reply that still hits the limit says so instead of just stopping.
 */
export async function runAssistant(messages: ChatMessage[]): Promise<{ reply: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "The AI assistant isn't configured yet. Ask an administrator to set ANTHROPIC_API_KEY.",
    );
  }

  const { default: AnthropicClient } = await import("@anthropic-ai/sdk");
  // Org-level (non-workspace-scoped) API keys reject every request with a 400 unless this
  // header names the workspace to bill against. Workspace-scoped keys don't need it, so it's
  // optional — only set ANTHROPIC_WORKSPACE_ID if ANTHROPIC_API_KEY isn't already scoped.
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  const client = new AnthropicClient({
    apiKey,
    defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
  });

  let response;
  try {
    response = await client.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      output_config: { effort: "low" },
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
    });
  } catch (error) {
    if (error instanceof AnthropicClient.AuthenticationError) {
      throw new Error("The AI assistant is misconfigured (invalid API key).");
    }
    if (error instanceof AnthropicClient.RateLimitError) {
      throw new Error("The assistant is busy right now — please try again in a moment.");
    }
    if (error instanceof AnthropicClient.APIError) {
      throw new Error(`Assistant error: ${error.message}`);
    }
    throw error;
  }

  if (response.stop_reason === "refusal") {
    return {
      reply:
        "I can't help with that request. Try rephrasing, or search the advocate directory or advice hub instead.",
    };
  }

  // Selected by type: a response can begin with thinking blocks.
  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );
  const text = textBlock?.text.trim();
  if (response.stop_reason === "max_tokens") {
    return {
      reply: text
        ? `${text}

(This answer was cut short. Ask me to continue, or ask about one part at a time.)`
        : "That needs a longer answer than I can give in one go. Try asking about one part of it at a time.",
    };
  }
  return { reply: text || "I didn't get a response — please try again." };
}
