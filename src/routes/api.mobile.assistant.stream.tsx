import { createFileRoute } from "@tanstack/react-router";

/**
 * Native/desktop SSE counterpart of /api/assistant/stream — Bearer Clerk auth, same
 * streamAssistant generator. Keep /api/mobile/assistant JSON for older app builds.
 */
export const Route = createFileRoute("/api/mobile/assistant/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleAssistantStreamRequest } = await import("@/lib/assistant-stream.server");
        return handleAssistantStreamRequest(request);
      },
    },
  },
});
