import { createFileRoute } from "@tanstack/react-router";
import { chatRequestSchema } from "@/lib/assistant.functions";

export const Route = createFileRoute("/api/mobile/assistant")({
  server: {
    handlers: {
      POST: async (ctx) => {
        const { mobilePost } = await import("@/lib/mobile-api.server");
        const { runAssistant } = await import("@/lib/assistant.server");
        return mobilePost(chatRequestSchema, (_ctx, body) => runAssistant(body.messages))(ctx);
      },
    },
  },
});
