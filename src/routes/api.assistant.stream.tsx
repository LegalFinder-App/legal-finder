import { createFileRoute } from "@tanstack/react-router";
import { chatRequestSchema } from "@/lib/assistant.functions";

/**
 * SSE stream for Counsellor AI on the web. Browser sessions authenticate via Clerk cookies
 * (same authenticateClerkRequest path as /api/mobile/*). Mobile keeps the non-streaming
 * /api/mobile/assistant JSON route.
 */
export const Route = createFileRoute("/api/assistant/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { UnauthorizedError, authenticateClerkRequest } = await import(
          "@/integrations/supabase/auth.server"
        );
        const { RateLimitError, enforceRateLimit } = await import("@/lib/rate-limit.server");
        const { streamAssistant } = await import("@/lib/assistant.server");
        const { ZodError } = await import("zod");

        try {
          const { userId } = await authenticateClerkRequest();
          await enforceRateLimit("assistant", userId);

          const raw = await request.json().catch(() => null);
          const body = chatRequestSchema.parse(raw);

          const encoder = new TextEncoder();
          const signal = request.signal;

          const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
              const send = (payload: unknown) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
              };

              try {
                for await (const event of streamAssistant(body.messages, {
                  signal,
                  mode: body.mode ?? "assistant",
                  attachments: body.attachments,
                })) {
                  send(event);
                  if (event.type === "done" || event.type === "error") break;
                }
              } catch (error) {
                if (!signal.aborted) {
                  send({
                    type: "error",
                    message:
                      error instanceof Error
                        ? error.message
                        : "Counsellor AI is unavailable right now.",
                  });
                }
              } finally {
                controller.close();
              }
            },
            cancel() {
              // Client disconnect / AbortController — Anthropic call sees request.signal.
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
              "X-Accel-Buffering": "no",
            },
          });
        } catch (error) {
          if (error instanceof UnauthorizedError) {
            return Response.json({ error: "Please sign in again." }, { status: 401 });
          }
          if (error instanceof RateLimitError) {
            return Response.json(
              { error: error.message },
              { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } },
            );
          }
          if (error instanceof ZodError) {
            return Response.json(
              { error: error.issues[0]?.message ?? "Invalid request." },
              { status: 400 },
            );
          }
          console.error("[api/assistant/stream]", error);
          const message =
            error instanceof Error && !/supabase|fetch|ECONN|undefined|null/i.test(error.message)
              ? error.message
              : "Something went wrong. Please try again.";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
