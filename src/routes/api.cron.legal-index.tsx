import { createFileRoute } from "@tanstack/react-router";

/** Compares without short-circuiting, so response timing doesn't leak how much matched. */
function constantTimeEqual(given: string | null, expected: string) {
  if (given === null) return false;
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/**
 * Nightly (and on-demand) re-index of published advice / judgments / library for FTS RAG.
 * Requires CRON_SECRET. Uses Anthropic only at query time (optional keyword expand + answers).
 */
async function handleLegalIndex(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || !constantTimeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { runLegalCorpusIndex } = await import("@/lib/legal-rag/index-corpus.server");
    const result = await runLegalCorpusIndex();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("[legal-index]", error instanceof Error ? error.name : "error");
    return Response.json({ error: "Legal corpus index failed" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/cron/legal-index")({
  server: {
    handlers: {
      GET: ({ request }) => handleLegalIndex(request),
    },
  },
});
