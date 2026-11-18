import type { CounsellorAdvocate } from "@/lib/assistant-advocates";
import type { CounsellorAttachment } from "@/lib/assistant-attachments";
import type { CounsellorSource } from "@/lib/assistant-sources";
import { clerkApiHeaders } from "@/lib/clerk-browser-token";

export type StreamChatMessage = { role: "user" | "assistant"; content: string };

export type StreamHandlers = {
  onStatus?: (label: string) => void;
  onDelta?: (text: string) => void;
  onSources?: (sources: CounsellorSource[]) => void;
  onAdvocates?: (advocates: CounsellorAdvocate[]) => void;
  onDone?: (stopReason: string | null) => void;
  signal?: AbortSignal;
  mode?: "assistant" | "research";
  attachments?: CounsellorAttachment[];
};

/**
 * Browser client for POST /api/assistant/stream. Sends the Clerk session JWT (same as the
 * mobile app) plus cookies, so a lagging session cookie cannot 401 a signed-in user.
 */
export async function streamCounsellorReply(
  messages: StreamChatMessage[],
  handlers: StreamHandlers = {},
): Promise<void> {
  const headers = await clerkApiHeaders({
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  });

  const body = JSON.stringify({
    messages,
    mode: handlers.mode ?? "assistant",
    attachments: handlers.attachments,
  });

  // Prefer Bearer (registered from useAuth). If the JWT is still hydrating, still try with
  // cookies — the server accepts either. Retry once on 401 after refreshing the token.
  let response = await fetch("/api/assistant/stream", {
    method: "POST",
    credentials: "include",
    headers,
    body,
    signal: handlers.signal,
  });

  if (response.status === 401) {
    const refreshed = await clerkApiHeaders({
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    });
    response = await fetch("/api/assistant/stream", {
      method: "POST",
      credentials: "include",
      headers: refreshed,
      body,
      signal: handlers.signal,
    });
  }

  if (!response.ok) {
    let message = "Counsellor AI is unavailable right now.";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      // Non-JSON error body.
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error("Counsellor AI returned an empty response.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separator = buffer.indexOf("\n\n");
    while (separator !== -1) {
      const chunk = buffer.slice(0, separator);
      buffer = buffer.slice(separator + 2);
      const dataLine = chunk
        .split("\n")
        .map((line) => line.trimEnd())
        .find((line) => line.startsWith("data:"));
      if (dataLine) {
        const raw = dataLine.slice(5).trim();
        if (raw) {
          const event = JSON.parse(raw) as {
            type: string;
            text?: string;
            label?: string;
            message?: string;
            stopReason?: string | null;
            sources?: CounsellorSource[];
            advocates?: CounsellorAdvocate[];
          };
          if (event.type === "status" && event.label) handlers.onStatus?.(event.label);
          if (event.type === "sources" && event.sources) handlers.onSources?.(event.sources);
          if (event.type === "advocates" && event.advocates) {
            handlers.onAdvocates?.(event.advocates);
          }
          if (event.type === "delta" && event.text) handlers.onDelta?.(event.text);
          if (event.type === "error") {
            throw new Error(event.message || "Counsellor AI is unavailable right now.");
          }
          if (event.type === "done") {
            handlers.onDone?.(event.stopReason ?? null);
            return;
          }
        }
      }
      separator = buffer.indexOf("\n\n");
    }
  }

  handlers.onDone?.(null);
}
