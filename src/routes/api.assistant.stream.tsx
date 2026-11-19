import { createFileRoute } from "@tanstack/react-router";

/**
 * SSE stream for Counsellor AI on the web. Browser sessions authenticate via Clerk cookies
 * or Bearer (same authenticateClerkRequest path as /api/mobile/*).
 */
export const Route = createFileRoute("/api/assistant/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleAssistantStreamRequest } = await import("@/lib/assistant-stream.server");
        return handleAssistantStreamRequest(request);
      },
    },
  },
});
