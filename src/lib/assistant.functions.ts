import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireClerkAuth } from "@/integrations/supabase/auth-middleware";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
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
});

/**
 * The Anthropic call lives in assistant.server.ts (dynamically imported — route/functions files are
 * dual-purpose, so server-only deps must not load at module scope).
 */
export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .validator(chatRequestSchema)
  .handler(async ({ data }) => {
    const { runAssistant } = await import("@/lib/assistant.server");
    return runAssistant(data.messages);
  });
