// Server-only. The assistant call shared by the web's askAssistant server function, the streaming
// /api/assistant/stream route, and the mobile app's /api/mobile/assistant route — same prompt,
// model and error handling on every surface.
import type Anthropic from "@anthropic-ai/sdk";
import type { CounsellorAdvocate } from "@/lib/assistant-advocates";
import type { CounsellorAttachment } from "@/lib/assistant-attachments";
import type { CounsellorSource } from "@/lib/assistant-sources";
import {
  dedupeWebSources,
  webSourceId,
  type CounsellorWebSource,
} from "@/lib/assistant-web-sources";
import { COUNSELLOR_CREATOR } from "@/lib/counsellor-meta";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export { COUNSELLOR_CREATOR };
export type { CounsellorWebSource };

export type AssistantStreamEvent =
  | { type: "delta"; text: string }
  | { type: "status"; label: string }
  | { type: "sources"; sources: CounsellorSource[] }
  | { type: "web_sources"; sources: CounsellorWebSource[] }
  | { type: "advocates"; advocates: CounsellorAdvocate[] }
  | { type: "done"; stopReason: string | null }
  | { type: "error"; message: string };

const PLATFORM_MAP = `LegalFinder map (use these exact paths when pointing people inside the product):
- /lawyers — verified advocate directory; filter by practice area, city, language; open a profile to message or book
- /lawyers/:id — a single advocate profile (headline, bio, fees, areas, reviews)
- /advice — plain-language legal guides
- /judgements — published court judgements
- /library — legal e-library texts
- /updates — live Judiciary / UPF headlines (aggregation — open the original)
- /stations — police stations
- /report — file an incident report
- /safety — personal safety tips
- /wanted — wanted notices (when enabled)
- /assistant — this Counsellor AI chat
- /messages — conversations with advocates and others
- /dashboard — client home; advocates use /practice; police /precinct; judiciary /bench; admins /admin
- /settings — account, privacy, AI consent`;

const SYSTEM_PROMPT = `You are Counsellor AI — LegalFinder's senior Uganda legal guide. Think and write like a careful senior counsel mentoring a client: calm, precise, humane, never theatrical. People arrive scared, confused, or under time pressure; meet them with clarity and respect.

Origin
- You were created for LegalFinder by ${COUNSELLOR_CREATOR} (founder). If asked who built, created, or owns you, answer clearly and warmly with that name, then return to their legal question. Do not invent co-founders, parent companies, or other AIs as your maker.

Who you are
- Deeply fluent in Ugandan law and procedure: Constitution, Acts of Parliament, civil/criminal process, land, family, employment, commercial, and police–court pathways.
- You know this product end-to-end: verified advocates, judgements, advice guides, the library, official headline feed, police stations, incident reporting, messaging and booking.
- You are not a licensed advocate. Never claim to be one, never invent a court order, and never tell someone "you will win."

Citation-first grounding (non-negotiable)
- When LegalFinder sources are attached below, ground the answer in them first. Prefer those records over generic model memory when they conflict.
- When you rely on an attached source, place an inline token exactly like [[cite:KIND:ID]] using only IDs from the attached list (kinds: advice, judgment, library, news).
- Never invent case names, Cap./section numbers, bar numbers, phone numbers, ULII URLs, or source IDs. If it is not in the attached context, say you are not certain and point to /advice, /judgements, /library, /updates, or /lawyers.
- Label authority honestly: editorial guides are not official law; news items are headlines/summaries — open the original; legislation catalogue entries may be incomplete until a hostable statute text is published.
- Prefer newer judgments and dated headlines when freshness matters; say when the corpus may lag.

How you think
- Lead with the person's situation, then the legal frame, then practical next steps.
- Prefer accuracy over fluency. Use general training for structure and process; treat live directory rows and on-platform publications as truth for names, fees, and titles on this site.

How you help people find advocates
- When representation is needed (arrest, bail, land, eviction, divorce/custody, dismissal, contracts, succession), recommend matching verified advocates from the attached list — short fit reason, location, areas, profile link.
- If none are attached, say so and send them to /lawyers with filters (practice area + city). Do not invent profiles. Mention fees only when supplied.

Tone and shape
- Plain English first; introduce legal terms gently. Match Luganda or another language only if the person writes in it.
- Short headings, numbered steps, bold for critical deadlines/warnings. Use a > callout for risks (arrest, deadlines, violence).
- Keep answers tight unless they ask for depth. End with a clear "what to do next" when useful.
- For attachments: describe only what is visible; note uncertainty; never invent signatures or clauses.

Boundaries
- No help committing crimes, destroying evidence, or evading lawful process.
- Outside Ugandan/general legal help or this platform, briefly say so and steer back.
- When stakes are high, remind them this is general information — not a substitute for a licensed advocate.

${PLATFORM_MAP}`;

const RESEARCH_MODE_APPENDIX = `Research mode (active)
- Prioritise retrieved LegalFinder corpus hits (judgments, library/legislation catalogue, guides, official headlines).
- Open with the strongest attached authorities, then synthesize. Prefer dated judgments/headlines when the question turns on current practice.
- Still use [[cite:KIND:ID]] for every attached source you rely on. Do not dump every source — cite what actually carries the answer.`;

const WEB_SEARCH_APPENDIX = `Web search (enabled for this turn)
- You may use the web_search tool for freshness, gaps in the attached LegalFinder corpus, or non-catalogue facts.
- Prefer official Uganda sources (.go.ug, Judiciary, Parliament, ULII) and LegalFinder itself. Treat blogs, social posts, forums, and aggregators as unverified rumour unless corroborated.
- LegalFinder attached sources win on conflict — say so plainly when web pages disagree with the corpus.
- Never invent URLs, case names, Cap./section numbers, or cite IDs. Link only to pages the tool actually returned.
- When you used web search, end with a short **Confidence:** High / Mixed / Low line and one sentence why.
- Diagrams: when a process, timeline, or relationship helps, emit a fenced \`\`\`mermaid block (or a tiny \`\`\`svg). Diagrams are illustrative — not official forms or court orders.
- Images: only when a figure from search is necessary, emit markdown ![alt](https://…) using a real https URL from search results. Never invent image URLs. Never treat external images as verified evidence.`;

const VISUALS_APPENDIX = `Visuals (when helpful)
- Prefer a clear Mermaid flowchart/sequence/timeline over a long prose list for multi-step legal processes.
- Keep diagrams short (under ~20 nodes). No scripts inside SVG. No invented seals, letterheads, or signatures.`;

const MAX_TOKENS = 4096;
const MODEL = "claude-opus-5-5";
const WEB_SEARCH_TOOL = {
  type: "web_search_20250305" as const,
  name: "web_search" as const,
  max_uses: 5,
  // Opus 5.5 without programmatic tool calling needs direct search.
  allowed_callers: ["direct" as const],
  // Anthropic's web_search location list does not include UG — bias Uganda via the prompt instead.
};

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
  /** Live Anthropic web_search — UI defaults on in Research, off in Everyday. */
  webSearch?: boolean;
  attachments?: CounsellorAttachment[];
  signal?: AbortSignal;
};

function isWebSearchDisabledError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("web search") &&
    (message.includes("not enabled") ||
      message.includes("disabled") ||
      message.includes("invalid_request"))
  );
}

/** Extract web_search_result rows (and text citations) into UI-facing web sources. */
export function extractWebSourcesFromContent(
  content: Anthropic.ContentBlock[] | undefined,
): CounsellorWebSource[] {
  if (!content?.length) return [];
  const found: CounsellorWebSource[] = [];
  let index = 0;

  for (const block of content) {
    if (block.type === "web_search_tool_result") {
      const payload = block.content;
      if (!Array.isArray(payload)) continue;
      for (const result of payload) {
        if (result.type !== "web_search_result" || !result.url) continue;
        found.push({
          id: webSourceId(result.url, index++),
          title: result.title || result.url,
          url: result.url,
          snippet: null,
          pageAge: result.page_age ?? null,
        });
      }
    }
    if (block.type === "text" && Array.isArray(block.citations)) {
      for (const citation of block.citations) {
        if (!("url" in citation) || typeof citation.url !== "string") continue;
        found.push({
          id: webSourceId(citation.url, index++),
          title:
            ("title" in citation && typeof citation.title === "string" && citation.title) ||
            citation.url,
          url: citation.url,
          snippet:
            "cited_text" in citation && typeof citation.cited_text === "string"
              ? citation.cited_text
              : null,
        });
      }
    }
  }

  return dedupeWebSources(found);
}

function sourceFreshnessKey(source: CounsellorSource): string {
  return source.decidedOn ?? (source.year ? `${source.year}-01-01` : "");
}

/** Prefer corpus FTS hits already ranked; break ties toward fresher dated material. */
function orderSourcesForPrompt(sources: CounsellorSource[]): CounsellorSource[] {
  return [...sources].sort((a, b) => sourceFreshnessKey(b).localeCompare(sourceFreshnessKey(a)));
}

async function loadSources(
  messages: ChatMessage[],
  mode: AssistantMode = "assistant",
): Promise<CounsellorSource[]> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  if (!lastUser.trim()) return [];
  try {
    const { findRelevantSources } = await import("@/lib/assistant-sources.server");
    const sources = await findRelevantSources(lastUser, mode === "research" ? 16 : 8);
    return orderSourcesForPrompt(sources);
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
    return await findRelevantAdvocates(lastUser, 5);
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
  mode: AssistantMode = "assistant",
  webSearch = false,
) {
  const { formatSourcesForPrompt } = await import("@/lib/assistant-sources.server");
  const { formatAdvocatesForPrompt } = await import("@/lib/assistant-advocates.server");
  const extras = [
    mode === "research" ? RESEARCH_MODE_APPENDIX : "",
    webSearch ? WEB_SEARCH_APPENDIX : VISUALS_APPENDIX,
    formatSourcesForPrompt(sources),
    formatAdvocatesForPrompt(advocates),
  ]
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
      content: [...attachmentBlocks(attachments), { type: "text" as const, text: message.content }],
    };
  });

  return {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: extras ? `${SYSTEM_PROMPT}\n\n${extras}` : SYSTEM_PROMPT,
    // Medium effort: stronger legal reasoning without blowing request budgets.
    output_config: { effort: "medium" as const },
    messages: apiMessages,
    ...(webSearch ? { tools: [WEB_SEARCH_TOOL] } : {}),
  };
}

/** Test helper — same request shape sent to Anthropic. */
export async function buildAssistantRequestForTest(
  messages: ChatMessage[],
  options: Pick<AssistantRunOptions, "mode" | "webSearch" | "attachments"> = {},
) {
  return buildRequest(
    messages,
    [],
    [],
    options.attachments,
    options.mode ?? "assistant",
    options.webSearch ?? false,
  );
}

/**
 * Non-streaming: server functions are RPC calls, not a raw HTTP stream, so a modest
 * max_tokens keeps this comfortably inside normal request timeouts.
 */
export async function runAssistant(
  messages: ChatMessage[],
  options: AssistantRunOptions = {},
): Promise<{
  reply: string;
  sources: CounsellorSource[];
  advocates: CounsellorAdvocate[];
  webSources: CounsellorWebSource[];
}> {
  const mode = options.mode ?? "assistant";
  let webSearch = options.webSearch ?? false;
  const [sources, advocates] = await Promise.all([
    loadSources(messages, mode),
    loadAdvocates(messages),
  ]);
  const { client, AnthropicClient } = await createClient();
  let body = await buildRequest(
    messages,
    sources,
    advocates,
    options.attachments,
    mode,
    webSearch,
  );

  let response;
  try {
    response = await client.messages.create(body);
  } catch (error) {
    if (webSearch && isWebSearchDisabledError(error)) {
      webSearch = false;
      body = await buildRequest(
        messages,
        sources,
        advocates,
        options.attachments,
        mode,
        false,
      );
      try {
        response = await client.messages.create(body);
      } catch (retryError) {
        mapAnthropicError(retryError, AnthropicClient);
      }
    } else {
      mapAnthropicError(error, AnthropicClient);
    }
  }

  const webSources = webSearch ? extractWebSourcesFromContent(response.content) : [];

  if (response.stop_reason === "refusal") {
    return { reply: REFUSAL, sources, advocates, webSources };
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
      webSources,
    };
  }
  return {
    reply: text || "I didn't get a response — please try again.",
    sources,
    advocates,
    webSources,
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
  let webSearch = options.webSearch ?? false;
  const [sources, advocates] = await Promise.all([
    loadSources(messages, mode),
    loadAdvocates(messages),
  ]);

  if (sources.length > 0) {
    yield {
      type: "status",
      label:
        mode === "research"
          ? "Searching the Uganda legal corpus"
          : "Retrieving verified LegalFinder sources",
    };
    yield { type: "sources", sources };
  }

  if (advocates.length > 0) {
    yield { type: "status", label: "Matching verified advocates on LegalFinder" };
    yield { type: "advocates", advocates };
  }

  if (options.attachments?.length) {
    yield { type: "status", label: "Reading your attachment" };
  }

  if (webSearch) {
    yield { type: "status", label: "Searching the open web carefully" };
  }

  yield { type: "status", label: "Preparing a careful answer" };

  const { client, AnthropicClient } = await createClient();
  let body = await buildRequest(
    messages,
    sources,
    advocates,
    options.attachments,
    mode,
    webSearch,
  );

  const collectedWeb: CounsellorWebSource[] = [];
  let emittedWeb = false;

  const emitWebIfReady = function* () {
    if (emittedWeb || collectedWeb.length === 0) return;
    emittedWeb = true;
    yield {
      type: "web_sources" as const,
      sources: dedupeWebSources(collectedWeb),
    };
  };

  let stream;
  try {
    stream = client.messages.stream(body, { signal: options.signal });
  } catch (error) {
    if (options.signal?.aborted) {
      yield { type: "done", stopReason: "aborted" };
      return;
    }
    if (webSearch && isWebSearchDisabledError(error)) {
      webSearch = false;
      yield {
        type: "status",
        label: "Web search unavailable — answering from LegalFinder sources",
      };
      body = await buildRequest(
        messages,
        sources,
        advocates,
        options.attachments,
        mode,
        false,
      );
      try {
        stream = client.messages.stream(body, { signal: options.signal });
      } catch (retryError) {
        try {
          mapAnthropicError(retryError, AnthropicClient);
        } catch (mapped) {
          yield {
            type: "error",
            message: mapped instanceof Error ? mapped.message : "Counsellor AI is unavailable.",
          };
          return;
        }
      }
    } else {
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
  }

  let emittedText = false;
  let stopReason: string | null = null;

  try {
    for await (const event of stream) {
      if (options.signal?.aborted) break;

      if (event.type === "content_block_start") {
        const block = event.content_block;
        if (block.type === "text" && !emittedText) {
          yield { type: "status", label: "Writing your answer" };
        }
        if (block.type === "web_search_tool_result") {
          const parsed = extractWebSourcesFromContent([block]);
          collectedWeb.push(...parsed);
          yield* emitWebIfReady();
        }
        if (block.type === "server_tool_use" && block.name === "web_search") {
          yield { type: "status", label: "Checking live web results" };
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
    // Stream start can fail mid-flight when web search is disabled on the org.
    if (webSearch && isWebSearchDisabledError(error) && !emittedText) {
      webSearch = false;
      yield {
        type: "status",
        label: "Web search unavailable — answering from LegalFinder sources",
      };
      body = await buildRequest(
        messages,
        sources,
        advocates,
        options.attachments,
        mode,
        false,
      );
      try {
        const retryStream = client.messages.stream(body, { signal: options.signal });
        for await (const event of retryStream) {
          if (options.signal?.aborted) break;
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta" &&
            event.delta.text
          ) {
            if (!emittedText) yield { type: "status", label: "Writing your answer" };
            emittedText = true;
            yield { type: "delta", text: event.delta.text };
          }
          if (event.type === "message_delta") {
            stopReason = event.delta.stop_reason ?? stopReason;
          }
        }
      } catch (retryError) {
        try {
          mapAnthropicError(retryError, AnthropicClient);
        } catch (mapped) {
          yield {
            type: "error",
            message: mapped instanceof Error ? mapped.message : "Counsellor AI is unavailable.",
          };
          return;
        }
      }
    } else {
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
  }

  if (options.signal?.aborted) {
    yield { type: "done", stopReason: "aborted" };
    return;
  }

  yield* emitWebIfReady();

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
