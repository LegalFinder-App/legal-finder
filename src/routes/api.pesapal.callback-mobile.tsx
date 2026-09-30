import { createFileRoute } from "@tanstack/react-router";

// Pesapal's return URL for payments started in the native app. Finalizes exactly like the web
// callback, then redirects to the app's scheme, which closes the in-app payment sheet. The app
// re-reads the real status from the payments row, so the status param here is only a hint.
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
  return Response.redirect(
    `legalfinder://payment-result?status=${encodeURIComponent(status)}`,
    302,
  );
}

export const Route = createFileRoute("/api/pesapal/callback-mobile")({
  server: {
    handlers: {
      GET: ({ request }) => handleCallback(request),
    },
  },
});
