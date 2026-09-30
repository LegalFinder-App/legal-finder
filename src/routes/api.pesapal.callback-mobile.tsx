import { createFileRoute } from "@tanstack/react-router";

// Pesapal's return URL for payments started in the native app. Finalizes exactly like the web
// callback, then hands control back to the app (legalfinder://payment-result closes the in-app
// payment sheet). The app re-reads the real status from the payments row, so the status param is
// only a hint.
//
// Served as a tiny page (auto-redirect + a button) rather than a bare 302: some Android browsers
// block a server redirect into a custom scheme without a fresh user tap, and a button always works.
const STATUS_COPY: Record<string, string> = {
  completed: "Payment received",
  failed: "Payment didn't go through",
  pending: "Payment is processing",
};

function page(status: string) {
  const appUrl = `legalfinder://payment-result?status=${encodeURIComponent(status)}`;
  const heading = STATUS_COPY[status] ?? "Returning to LegalFinder";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading} — LegalFinder</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b182b;color:#f4f1eb;
font-family:system-ui,sans-serif;text-align:center;padding:24px}a{display:inline-block;margin-top:20px;
background:#bb8739;color:#101926;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:600}
p{opacity:.75}</style></head><body><main><h1>${heading}</h1>
<p>Taking you back to the LegalFinder app…</p><a href="${appUrl}">Return to LegalFinder</a></main>
<script>location.replace(${JSON.stringify(appUrl)});</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

async function handleCallback(request: Request) {
  const url = new URL(request.url);
  const orderTrackingId = url.searchParams.get("OrderTrackingId");
  let status = "error";
  if (orderTrackingId) {
    try {
      const { finalizePayment } = await import("@/lib/pesapal.server");
      status = await finalizePayment(orderTrackingId);
    } catch (error) {
      console.error("[pesapal-callback-mobile]", error);
    }
  }
  // Only known values reach the page (the status is interpolated into HTML).
  return page(STATUS_COPY[status] ? status : "error");
}

export const Route = createFileRoute("/api/pesapal/callback-mobile")({
  server: {
    handlers: {
      GET: ({ request }) => handleCallback(request),
    },
  },
});
