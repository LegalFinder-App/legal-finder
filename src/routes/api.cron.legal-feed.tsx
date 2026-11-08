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

// Daily legal-feed sync (Vercel Cron, vercel.json). The collector is imported inside the handler
// so its server-only dependencies never reach the client bundle — same pattern as
// api.cron.compliance-check.tsx.
async function handleLegalFeedSync(request: Request) {
  // Fail closed: without CRON_SECRET nobody may trigger outbound requests to government sites.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || !constantTimeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { runLegalFeedSync } = await import("@/lib/legal-feed/sync.server");
    return Response.json({ ok: true, ...(await runLegalFeedSync()) });
  } catch (error) {
    console.error("[legal-feed]", error);
    return Response.json({ error: "Legal feed sync failed" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/cron/legal-feed")({
  server: {
    handlers: {
      GET: ({ request }) => handleLegalFeedSync(request),
    },
  },
});
