import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A stand-in for the Anthropic SDK: records the request and replays a canned response or error.
const sdk = vi.hoisted(() => {
  class APIError extends Error {}
  class AuthenticationError extends APIError {}
  class RateLimitError extends APIError {}
  const create = vi.fn();
  const constructed: Record<string, unknown>[] = [];
  class Client {
    static APIError = APIError;
    static AuthenticationError = AuthenticationError;
    static RateLimitError = RateLimitError;
    messages = { create };
    constructor(options: Record<string, unknown>) {
      constructed.push(options);
    }
  }
  return { Client, create, constructed, APIError, AuthenticationError, RateLimitError };
});

vi.mock("@anthropic-ai/sdk", () => ({ default: sdk.Client }));

import { chatRequestSchema } from "../assistant.functions";
import { runAssistant } from "../assistant.server";
import { draftDocument } from "../document-drafting.server";

const question = [{ role: "user" as const, content: "How do I report a stolen phone?" }];
const text = (value: string) => ({ type: "text", text: value });
// What a thinking block looks like with the default display: present, but with no readable text.
const thinking = { type: "thinking", thinking: "", signature: "sig" };

beforeEach(() => {
  sdk.create.mockReset();
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
    await expect(runAssistant(question)).resolves.toEqual({ reply: "Go to the police." });
    const request = sdk.create.mock.calls[0][0];
    expect(request.model).toBe("claude-opus-5-5");
    expect(request.output_config).toEqual({ effort: "low" });
    expect(request.messages).toEqual(question);
    // Rejected by this model: thinking can't be switched off or budgeted, and sampling is fixed.
    expect(request).not.toHaveProperty("thinking");
    expect(request).not.toHaveProperty("temperature");
  });

  it("reads the answer by block type, since a response can begin with thinking", async () => {
    sdk.create.mockResolvedValue({ stop_reason: "end_turn", content: [thinking, text("Answer.")] });
    await expect(runAssistant(question)).resolves.toEqual({ reply: "Answer." });
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
