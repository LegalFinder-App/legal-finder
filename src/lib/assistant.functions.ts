import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimited } from "@/lib/rate-limit-middleware";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const attachmentSchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum(["image", "pdf"]),
  url: z.string().url().max(2000),
  name: z.string().min(1).max(200),
  mimeType: z.string().min(3).max(100),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
});

// Also used by /api/mobile/assistant to validate the native app's requests identically.
export const chatRequestSchema = z.object({
  messages: z
    .array(chatMessageSchema)
    .min(1)
    .max(20)
    // The API rejects a conversation that ends on the assistant's own words.
    .refine((messages) => messages[messages.length - 1]?.role === "user", {
      message: "The last message must be a question from you.",
    }),
  mode: z.enum(["assistant", "research"]).optional(),
  /** Live Anthropic web_search; UI defaults on in Research, off in Everyday. */
  webSearch: z.boolean().optional(),
  /** Applied to the latest user turn for multimodal Counsellor requests. */
  attachments: z.array(attachmentSchema).max(3).optional(),
});

export const researchRequestSchema = z.object({
  query: z.string().max(400).default(""),
  kinds: z
    .array(z.enum(["advice", "judgment", "library", "news"]))
    .max(4)
    .optional(),
  court: z.string().max(120).nullable().optional(),
  category: z.string().max(120).nullable().optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  limit: z.number().int().min(1).max(40).optional(),
});

/**
 * The Anthropic call lives in assistant.server.ts (dynamically imported — route/functions files are
 * dual-purpose, so server-only deps must not load at module scope).
 */
export const askAssistant = createServerFn({ method: "POST" })
  .middleware([rateLimited("assistant")])
  .validator(chatRequestSchema)
  .handler(async ({ data }) => {
    const { runAssistant } = await import("@/lib/assistant.server");
    return runAssistant(data.messages, {
      mode: data.mode ?? "assistant",
      webSearch: data.webSearch ?? false,
      attachments: data.attachments,
    });
  });
