import { createFileRoute } from "@tanstack/react-router";

// Server-only compliance-check module is dynamically imported inside the handler — this route
// file is dual-purpose (it also exists in the client route tree), so secret-touching deps must
// not load at module scope. Triggered daily by the Vercel Cron job in vercel.json.
async function handleComplianceCheck(request: Request) {
  // Fail closed: an unset CRON_SECRET must reject every request, not leave this endpoint open —
  // it triggers a bulk scan-and-notify pass over every advocate and case deadline in the system.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const { secretsMatch } = await import("@/lib/secure-compare.server");
  if (!cronSecret || !secretsMatch(authHeader, `Bearer ${cronSecret}`)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { runComplianceCheck } = await import("@/lib/compliance-check.server");
    const result = await runComplianceCheck();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    // The detail goes to the logs, not to whoever called.
    console.error("[compliance-check]", error);
    return Response.json({ error: "Compliance check failed" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/cron/compliance-check")({
  server: {
    handlers: {
      GET: ({ request }) => handleComplianceCheck(request),
    },
  },
});
