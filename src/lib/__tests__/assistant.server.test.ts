import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A stand-in for the Anthropic SDK: records the request and replays a canned response or error.
const sdk = vi.hoisted(() => {
  class APIError extends Error {}
  class AuthenticationError extends APIError {}
  class RateLimitError extends APIError {}
  const create = vi.fn();
  const constructed: Record<string, unknown>[] = [];
  const stream = vi.fn();
  class Client {
    static APIError = APIError;
    static AuthenticationError = AuthenticationError;
    static RateLimitError = RateLimitError;
    messages = { create, stream };
    constructor(options: Record<string, unknown>) {
      constructed.push(options);
    }
  }
  return { Client, create, stream, constructed, APIError, AuthenticationError, RateLimitError };
});

vi.mock("@anthropic-ai/sdk", () => ({ default: sdk.Client }));

import { chatRequestSchema } from "../assistant.functions";
import {
  buildAssistantRequestForTest,
  extractWebSourcesFromContent,
  runAssistant,
  streamAssistant,
} from "../assistant.server";
import { draftDocument } from "../document-drafting.server";

async function collectStream(messages: typeof question) {
  const events = [];
  for await (const event of streamAssistant(messages)) events.push(event);
  return events;
}

const question = [{ role: "user" as const, content: "How do I report a stolen phone?" }];
const text = (value: string) => ({ type: "text", text: value });
// What a thinking block looks like with the default display: present, but with no readable text.
const thinking = { type: "thinking", thinking: "", signature: "sig" };

beforeEach(() => {
  sdk.create.mockReset();
  sdk.stream.mockReset();
  sdk.constructed.length = 0;
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.stubEnv("ANTHROPIC_WORKSPACE_ID", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("runAssistant", () => {
  it("says so plainly when no key is configured, without calling the API", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    await expect(runAssistant(question)).rejects.toThrow(/isn't configured yet/);
    expect(sdk.create).not.toHaveBeenCalled();
  });

  it("asks the current model for a short answer and returns its text", async () => {
    sdk.create.mockResolvedValue({ stop_reason: "end_turn", content: [text("Go to the police.")] });
    await expect(runAssistant(question)).resolves.toEqual({
      reply: "Go to the police.",
      sources: [],
      advocates: [],
      webSources: [],
    });
    // Source lookup may also call Anthropic (query expand uses Haiku) — assert the Counsellor turn.
    const request = sdk.create.mock.calls.map((c) => c[0]).find((r) => r.model === "claude-opus-5-5");
    expect(request).toBeTruthy();
    expect(request.output_config).toEqual({ effort: "medium" });
    expect(request.messages).toEqual(question);
    expect(request).not.toHaveProperty("tools");
    // Rejected by this model: thinking can't be switched off or budgeted, and sampling is fixed.
    expect(request).not.toHaveProperty("thinking");
    expect(request).not.toHaveProperty("temperature");
  });

  it("reads the answer by block type, since a response can begin with thinking", async () => {
    sdk.create.mockResolvedValue({ stop_reason: "end_turn", content: [thinking, text("Answer.")] });
    await expect(runAssistant(question)).resolves.toEqual({
      reply: "Answer.",
      sources: [],
      advocates: [],
      webSources: [],
    });
  });

  it("includes the Anthropic web_search tool only when webSearch is on", async () => {
    const off = await buildAssistantRequestForTest(question, { webSearch: false });
    expect(off).not.toHaveProperty("tools");
    const on = await buildAssistantRequestForTest(question, { webSearch: true });
    expect(on.tools).toEqual([
      expect.objectContaining({ type: "web_search_20250305", name: "web_search" }),
    ]);
    expect(on.system).toMatch(/Web search \(enabled/);
  });

  it("parses web_search_tool_result blocks into webSources", () => {
    const sources = extractWebSourcesFromContent([
      {
        type: "web_search_tool_result",
        tool_use_id: "srvtoolu_1",
        content: [
          {
            type: "web_search_result",
            title: "Judiciary of Uganda",
            url: "https://judiciary.go.ug/example",
            encrypted_content: "x",
            page_age: null,
          },
        ],
      } as never,
    ]);
    expect(sources).toHaveLength(1);
    expect(sources[0]?.url).toBe("https://judiciary.go.ug/example");
  });

  it("tells the reader when the answer hit the length limit", async () => {
    sdk.create.mockResolvedValue({ stop_reason: "max_tokens", content: [text("First, you")] });
    const { reply } = await runAssistant(question);
    expect(reply.startsWith("First, you")).toBe(true);
    expect(reply).toMatch(/cut short/);
  });

  it("doesn't return an empty reply when thinking used up the whole limit", async () => {
    sdk.create.mockResolvedValue({ stop_reason: "max_tokens", content: [thinking] });
    const { reply } = await runAssistant(question);
    expect(reply).toMatch(/one part of it at a time/);
  });

  it("turns a refusal into a pointer to the directory", async () => {
    sdk.create.mockResolvedValue({ stop_reason: "refusal", content: [] });
    const { reply } = await runAssistant(question);
    expect(reply).toMatch(/can't help with that request/);
  });

  it("maps a rejected key and a rate limit to messages a person can act on", async () => {
    sdk.create.mockRejectedValueOnce(new sdk.AuthenticationError("401"));
    await expect(runAssistant(question)).rejects.toThrow(/invalid API key/);
    sdk.create.mockRejectedValueOnce(new sdk.RateLimitError("429"));
    await expect(runAssistant(question)).rejects.toThrow(/busy right now/);
    sdk.create.mockRejectedValueOnce(new sdk.APIError("model not found"));
    await expect(runAssistant(question)).rejects.toThrow("Assistant error: model not found");
  });

  it("names the workspace only when one is configured", async () => {
    sdk.create.mockResolvedValue({ stop_reason: "end_turn", content: [text("ok")] });
    await runAssistant(question);
    expect(sdk.constructed[0].defaultHeaders).toBeUndefined();
    vi.stubEnv("ANTHROPIC_WORKSPACE_ID", "wrkspc_1");
    await runAssistant(question);
    expect(sdk.constructed[1].defaultHeaders).toEqual({ "anthropic-workspace-id": "wrkspc_1" });
  });
});

describe("streamAssistant", () => {
  it("streams text deltas and ignores thinking blocks", async () => {
    async function* events() {
      yield { type: "content_block_start", content_block: { type: "thinking" } };
      yield { type: "content_block_delta", delta: { type: "thinking_delta", thinking: "…" } };
      yield { type: "content_block_start", content_block: { type: "text" } };
      yield { type: "content_block_delta", delta: { type: "text_delta", text: "Go " } };
      yield { type: "content_block_delta", delta: { type: "text_delta", text: "to the police." } };
      yield { type: "message_delta", delta: { stop_reason: "end_turn" } };
    }
    sdk.stream.mockReturnValue(events());
    const received = await collectStream(question);
    expect(received.filter((e) => e.type === "delta")).toEqual([
      { type: "delta", text: "Go " },
      { type: "delta", text: "to the police." },
    ]);
    expect(received.at(-1)).toEqual({ type: "done", stopReason: "end_turn" });
    expect(sdk.stream.mock.calls[0][0].model).toBe("claude-opus-5-5");
  });

  it("appends the cut-short note when the stream hits max_tokens", async () => {
    async function* events() {
      yield { type: "content_block_delta", delta: { type: "text_delta", text: "First," } };
      yield { type: "message_delta", delta: { stop_reason: "max_tokens" } };
    }
    sdk.stream.mockReturnValue(events());
    const received = await collectStream(question);
    const deltas = received
      .filter((e) => e.type === "delta")
      .map((e) => e.text)
      .join("");
    expect(deltas).toContain("First,");
    expect(deltas).toMatch(/cut short/);
  });
});

describe("chatRequestSchema", () => {
  it("accepts a conversation that ends with the user's question", () => {
    const conversation = [...question, { role: "assistant", content: "Report it." }, ...question];
    expect(chatRequestSchema.safeParse({ messages: conversation }).success).toBe(true);
  });

  it("rejects one that ends on the assistant's words (the API refuses a prefilled reply)", () => {
    const conversation = [...question, { role: "assistant", content: "Report it." }];
    const result = chatRequestSchema.safeParse({ messages: conversation });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("The last message must be a question from you.");
  });
});

describe("draftDocument", () => {
  const request = { documentType: "Demand letter", instructions: "Rent arrears, 14 days." };

  it("returns the drafted text from the current model", async () => {
    sdk.create.mockResolvedValue({
      stop_reason: "end_turn",
      content: [thinking, text("RE: RENT")],
    });
    await expect(draftDocument(request)).resolves.toEqual({ draftText: "RE: RENT" });
    const sent = sdk.create.mock.calls[0][0];
    expect(sent.model).toBe("claude-opus-5-5");
    expect(sent.output_config).toEqual({ effort: "medium" });
    expect(sent.messages[0].content).toContain("Document type: Demand letter");
  });

  it("refuses to hand back a draft that stopped at the length limit", async () => {
    sdk.create.mockResolvedValue({ stop_reason: "max_tokens", content: [text("1. The Tenant")] });
    await expect(draftDocument(request)).rejects.toThrow(/too long to finish/);
  });

  it("reports a refusal and an empty response as errors", async () => {
    sdk.create.mockResolvedValueOnce({ stop_reason: "refusal", content: [] });
    await expect(draftDocument(request)).rejects.toThrow(/couldn't draft that/);
    sdk.create.mockResolvedValueOnce({ stop_reason: "end_turn", content: [thinking] });
    await expect(draftDocument(request)).rejects.toThrow(/No draft was returned/);
  });
});
