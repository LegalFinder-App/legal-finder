// Server-only. The assistant call shared by the web's askAssistant server function, the streaming
// /api/assistant/stream route, and the mobile app's /api/mobile/assistant route — same prompt,
// model and error handling on every surface.
import type Anthropic from "@anthropic-ai/sdk";
import type { CounsellorAdvocate } from "@/lib/assistant-advocates";
import type { CounsellorAttachment } from "@/lib/assistant-attachments";
import type { CounsellorSource } from "@/lib/assistant-sources";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type AssistantStreamEvent =
  | { type: "delta"; text: string }
  | { type: "status"; label: string }
  | { type: "sources"; sources: CounsellorSource[] }
  | { type: "advocates"; advocates: CounsellorAdvocate[] }
  | { type: "done"; stopReason: string | null }
  | { type: "error"; message: string };

const SYSTEM_PROMPT = `You are Counsellor AI, the legal intelligence assistant inside LegalFinder — a Uganda-focused platform connecting clients with verified advocates, court judgements, police services and plain-language legal guidance.

Ground rules:
- Give clear, practical, plain-language information about Ugandan law and legal processes. You are not a substitute for a licensed advocate and must not present yourself as one — for anything that requires representation, filing, or a binding opinion, direct the person to search the verified advocate directory at /lawyers or book a consultation.
- Prefer well-structured Markdown: short headings where helpful, bullet or numbered lists for steps, bold for key terms, and > callouts for warnings. Keep answers concise (a few short paragraphs or a short list, not an essay) unless the person asks for more detail.
- When the person attaches an image or PDF, describe what you can see that is legally relevant, note uncertainty, and never invent clauses or signatures that are not visible.
- When relevant, point to the right in-app destination: /lawyers (advocate directory), /advice (guides), /judgements (case law), /safety (security tips), /stations (police stations), /report (file an incident).
- If asked about anything outside Ugandan/general legal topics or this platform, briefly redirect back to what you can help with.
- Never fabricate case citations, statute numbers, or advocate names — if you're not certain, say so and point to the directory or advice hub instead of guessing.`;

const MAX_TOKENS = 2048;
const MODEL = "claude-opus-5-5";

const CUT_SHORT =
  "\n\n(This answer was cut short. Ask me to continue, or ask about one part at a time.)";
const EMPTY_CUT =
  "That needs a longer answer than I can give in one go. Try asking about one part of it at a time.";
const REFUSAL =
  "I can't help with that request. Try rephrasing, or search the advocate directory or advice hub instead.";

function requireApiKey() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "The AI assistant isn't configured yet. Ask an administrator to set ANTHROPIC_API_KEY.",
    );
  }
  return apiKey;
}

async function createClient() {
  const apiKey = requireApiKey();
  const { default: AnthropicClient } = await import("@anthropic-ai/sdk");
  // Org-level (non-workspace-scoped) API keys reject every request with a 400 unless this
  // header names the workspace to bill against. Workspace-scoped keys don't need it, so it's
  // optional — only set ANTHROPIC_WORKSPACE_ID if ANTHROPIC_API_KEY isn't already scoped.
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  const client = new AnthropicClient({
    apiKey,
    defaultHeaders: workspaceId ? { "anthropic-workspace-id": workspaceId } : undefined,
  });
  return { client, AnthropicClient };
}

function mapAnthropicError(
  error: unknown,
  AnthropicClient: typeof import("@anthropic-ai/sdk").default,
): never {
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

export type AssistantMode = "assistant" | "research";

export type AssistantRunOptions = {
  mode?: AssistantMode;
  attachments?: CounsellorAttachment[];
  signal?: AbortSignal;
};

async function loadSources(
  messages: ChatMessage[],
  mode: AssistantMode = "assistant",
): Promise<CounsellorSource[]> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  if (!lastUser.trim()) return [];
  try {
    const { findRelevantSources } = await import("@/lib/assistant-sources.server");
    return await findRelevantSources(lastUser, mode === "research" ? 12 : 6);
  } catch (error) {
    console.error("[assistant] source lookup failed", error);
    return [];
  }
}

async function loadAdvocates(messages: ChatMessage[]): Promise<CounsellorAdvocate[]> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  if (!lastUser.trim()) return [];
  try {
    const { findRelevantAdvocates } = await import("@/lib/assistant-advocates.server");
    return await findRelevantAdvocates(lastUser);
  } catch (error) {
    console.error("[assistant] advocate lookup failed", error);
    return [];
  }
}

function attachmentBlocks(
  attachments: CounsellorAttachment[] | undefined,
): Anthropic.ContentBlockParam[] {
  if (!attachments?.length) return [];
  const blocks: Anthropic.ContentBlockParam[] = [];
  for (const file of attachments.slice(0, 3)) {
    if (file.kind === "image") {
      blocks.push({
        type: "image",
        source: { type: "url", url: file.url },
      });
    } else {
      blocks.push({
        type: "document",
        source: { type: "url", url: file.url },
        title: file.name,
      });
    }
  }
  return blocks;
}

async function buildRequest(
  messages: ChatMessage[],
  sources: CounsellorSource[],
  advocates: CounsellorAdvocate[],
  attachments?: CounsellorAttachment[],
) {
  const { formatSourcesForPrompt } = await import("@/lib/assistant-sources.server");
  const { formatAdvocatesForPrompt } = await import("@/lib/assistant-advocates.server");
  const extras = [formatSourcesForPrompt(sources), formatAdvocatesForPrompt(advocates)]
    .filter(Boolean)
    .join("\n\n");

  const apiMessages: Anthropic.MessageParam[] = messages.map((message, index) => {
    const isLastUser =
      message.role === "user" && index === messages.length - 1 && (attachments?.length ?? 0) > 0;
    if (!isLastUser) {
      return { role: message.role, content: message.content };
    }
    return {
      role: "user" as const,
      content: [
        ...attachmentBlocks(attachments),
        { type: "text" as const, text: message.content },
      ],
    };
  });

  return {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: extras ? `${SYSTEM_PROMPT}\n\n${extras}` : SYSTEM_PROMPT,
    output_config: { effort: "low" as const },
    messages: apiMessages,
  };
}

/**
 * Non-streaming: server functions are RPC calls, not a raw HTTP stream, so low effort + a modest
 * max_tokens keeps this comfortably inside normal request timeouts.
 */
export async function runAssistant(
  messages: ChatMessage[],
  options: AssistantRunOptions = {},
): Promise<{
  reply: string;
  sources: CounsellorSource[];
  advocates: CounsellorAdvocate[];
}> {
  const mode = options.mode ?? "assistant";
  const [sources, advocates] = await Promise.all([
    loadSources(messages, mode),
    loadAdvocates(messages),
  ]);
  const { client, AnthropicClient } = await createClient();
  const body = await buildRequest(messages, sources, advocates, options.attachments);

  let response;
  try {
    response = await client.messages.create(body);
  } catch (error) {
    mapAnthropicError(error, AnthropicClient);
  }

  if (response.stop_reason === "refusal") {
    return { reply: REFUSAL, sources, advocates };
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );
  const text = textBlock?.text.trim();
  if (response.stop_reason === "max_tokens") {
    return {
      reply: text ? `${text}${CUT_SHORT}` : EMPTY_CUT,
      sources,
      advocates,
    };
  }
  return {
    reply: text || "I didn't get a response — please try again.",
    sources,
    advocates,
  };
}

/**
 * Streaming counterpart for the web Counsellor UI. Yields retrieved sources/advocates first,
 * then text deltas (never thinking content).
 */
export async function* streamAssistant(
  messages: ChatMessage[],
  options: AssistantRunOptions = {},
): AsyncGenerator<AssistantStreamEvent> {
  yield { type: "status", label: "Understanding your question" };

  const mode = options.mode ?? "assistant";
  const [sources, advocates] = await Promise.all([
    loadSources(messages, mode),
    loadAdvocates(messages),
  ]);

  if (sources.length > 0) {
    yield {
      type: "status",
      label:
        mode === "research"
          ? "Searching LegalFinder research sources"
          : "Reviewing LegalFinder sources",
    };
    yield { type: "sources", sources };
  }

  if (advocates.length > 0) {
    yield { type: "status", label: "Finding verified advocates" };
    yield { type: "advocates", advocates };
  }

  if (options.attachments?.length) {
    yield { type: "status", label: "Reading your attachment" };
  }

  const { client, AnthropicClient } = await createClient();
  const body = await buildRequest(messages, sources, advocates, options.attachments);

  let stream;
  try {
    stream = client.messages.stream(body, { signal: options.signal });
  } catch (error) {
    if (options.signal?.aborted) {
      yield { type: "done", stopReason: "aborted" };
      return;
    }
    try {
      mapAnthropicError(error, AnthropicClient);
    } catch (mapped) {
      yield {
        type: "error",
        message: mapped instanceof Error ? mapped.message : "Counsellor AI is unavailable.",
      };
      return;
    }
  }

  let emittedText = false;
  let stopReason: string | null = null;

  try {
    for await (const event of stream) {
      if (options.signal?.aborted) break;

      if (event.type === "content_block_start" && event.content_block.type === "text") {
        if (!emittedText) {
          yield { type: "status", label: "Preparing your answer" };
        }
      }

      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta" &&
        event.delta.text
      ) {
        emittedText = true;
        yield { type: "delta", text: event.delta.text };
      }

      if (event.type === "message_delta") {
        stopReason = event.delta.stop_reason ?? stopReason;
      }
    }
  } catch (error) {
    if (options.signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      yield { type: "done", stopReason: "aborted" };
      return;
    }
    try {
      mapAnthropicError(error, AnthropicClient);
    } catch (mapped) {
      yield {
        type: "error",
        message: mapped instanceof Error ? mapped.message : "Counsellor AI is unavailable.",
      };
      return;
    }
  }

  if (options.signal?.aborted) {
    yield { type: "done", stopReason: "aborted" };
    return;
  }

  if (stopReason === "refusal") {
    if (!emittedText) yield { type: "delta", text: REFUSAL };
    yield { type: "done", stopReason };
    return;
  }

  if (stopReason === "max_tokens") {
    yield { type: "delta", text: emittedText ? CUT_SHORT : EMPTY_CUT };
  } else if (!emittedText) {
    yield { type: "delta", text: "I didn't get a response — please try again." };
  }

  yield { type: "done", stopReason };
}
