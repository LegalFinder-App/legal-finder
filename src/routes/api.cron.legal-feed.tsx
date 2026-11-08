import { createFileRoute } from "@tanstack/react-router";

// Daily legal-feed sync (Vercel Cron, vercel.json). The collector is imported inside the handler
// so its server-only dependencies never reach the client bundle — same pattern as
// api.cron.compliance-check.tsx.
async function handleLegalFeedSync(request: Request) {
  // Fail closed: without CRON_SECRET nobody may trigger outbound requests to government sites.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const { secretsMatch } = await import("@/lib/secure-compare.server");
  if (!cronSecret || !secretsMatch(authHeader, `Bearer ${cronSecret}`)) {
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
