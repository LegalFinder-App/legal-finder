import { env } from "./env";
import { getAuthToken } from "./auth-token";
import { bridgedFetch } from "./bridged-fetch";
import { ApiError, type AssistantAdvocate, type AssistantSource, type AssistantWebSource } from "./api";
import type { CounsellorAttachment } from "./assistant-attachments";

export type StreamChatMessage = { role: "user" | "assistant"; content: string };

export type StreamHandlers = {
  onStatus?: (label: string) => void;
  onDelta?: (text: string) => void;
  onSources?: (sources: AssistantSource[]) => void;
  onWebSources?: (sources: AssistantWebSource[]) => void;
  onAdvocates?: (advocates: AssistantAdvocate[]) => void;
  onDone?: (stopReason: string | null) => void;
  signal?: AbortSignal;
  mode?: "assistant" | "research";
  webSearch?: boolean;
  attachments?: CounsellorAttachment[];
};

const ROUTE_MISSING = "Only HTML requests are supported here";

function dispatchEvent(
  event: {
    type: string;
    text?: string;
    label?: string;
    message?: string;
    stopReason?: string | null;
    sources?: AssistantSource[] | AssistantWebSource[];
    advocates?: AssistantAdvocate[];
  },
  handlers: StreamHandlers,
): "continue" | "done" {
  if (event.type === "status" && event.label) handlers.onStatus?.(event.label);
  if (event.type === "sources" && event.sources) {
    handlers.onSources?.(event.sources as AssistantSource[]);
  }
  if (event.type === "web_sources" && event.sources) {
    handlers.onWebSources?.(event.sources as AssistantWebSource[]);
  }
  if (event.type === "advocates" && event.advocates) {
    handlers.onAdvocates?.(event.advocates);
  }
  if (event.type === "delta" && event.text) handlers.onDelta?.(event.text);
  if (event.type === "error") {
    throw new ApiError(event.message || "Counsellor AI is unavailable right now.", 500);
  }
  if (event.type === "done") {
    handlers.onDone?.(event.stopReason ?? null);
    return "done";
  }
  return "continue";
}

function consumeSseBuffer(buffer: string, handlers: StreamHandlers): { rest: string; done: boolean } {
  let rest = buffer;
  let separator = rest.indexOf("\n\n");
  while (separator !== -1) {
    const chunk = rest.slice(0, separator);
    rest = rest.slice(separator + 2);
    const dataLine = chunk
      .split("\n")
      .map((line) => line.trimEnd())
      .find((line) => line.startsWith("data:"));
    if (dataLine) {
      const raw = dataLine.slice(5).trim();
      if (raw) {
        const event = JSON.parse(raw) as Parameters<typeof dispatchEvent>[0];
        if (dispatchEvent(event, handlers) === "done") {
          return { rest: "", done: true };
        }
      }
    }
    separator = rest.indexOf("\n\n");
  }
  return { rest, done: false };
}

/**
 * Streams Counsellor replies from /api/mobile/assistant/stream (SSE).
 * On phones this is progressive; the desktop shell may buffer the full body first
 * (still parses the same events). Falls back to JSON /api/mobile/assistant if the
 * stream route is missing on an older deploy.
 */
export async function streamAssistantReply(
  messages: StreamChatMessage[],
  handlers: StreamHandlers = {},
): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new ApiError("Please sign in to continue.", 401);

  const body = JSON.stringify({
    messages,
    mode: handlers.mode ?? "assistant",
    webSearch: handlers.webSearch ?? false,
    attachments: handlers.attachments,
  });

  let response: Response;
  try {
    response = await bridgedFetch(`${env.apiUrl}/api/mobile/assistant/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
      },
      body,
      signal: handlers.signal,
    });
  } catch {
    if (handlers.signal?.aborted) return;
    throw new ApiError("You appear to be offline. Check your connection and try again.", 0);
  }

  if (!response.ok) {
    let serverMessage: string | null = null;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) serverMessage = payload.error;
    } catch {
      // Non-JSON.
    }
    const routeMissing =
      serverMessage === ROUTE_MISSING || (response.status === 404 && !serverMessage);
    throw new ApiError(
      routeMissing
        ? "This isn't available on the LegalFinder server yet. Please try again later."
        : (serverMessage ?? `Request failed (${response.status})`),
      routeMissing ? 404 : response.status,
    );
  }

  // Desktop bridge may hand back a fully-buffered body without a streaming reader.
  if (!response.body || typeof response.body.getReader !== "function") {
    const text = await response.text();
    const { done } = consumeSseBuffer(text.endsWith("\n\n") ? text : `${text}\n\n`, handlers);
    if (!done) handlers.onDone?.(null);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const consumed = consumeSseBuffer(buffer, handlers);
    buffer = consumed.rest;
    if (consumed.done) return;
  }

  if (buffer.trim()) {
    const consumed = consumeSseBuffer(`${buffer}\n\n`, handlers);
    if (consumed.done) return;
  }

  handlers.onDone?.(null);
}
