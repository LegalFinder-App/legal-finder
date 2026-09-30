import { createFileRoute } from "@tanstack/react-router";
import { redirectTo } from "@/lib/http";

// Server-only Pesapal module is dynamically imported inside the handler below — this route file
// is dual-purpose (it also exists in the client route tree), so secret-touching deps must not
// load at module scope.
async function handleCallback(request: Request) {
  const url = new URL(request.url);
  const orderTrackingId = url.searchParams.get("OrderTrackingId");

  if (!orderTrackingId) {
    return redirectTo(`${url.origin}/dashboard?payment=error`);
  }

  try {
    const { finalizePayment } = await import("@/lib/pesapal.server");
    const status = await finalizePayment(orderTrackingId);
    return redirectTo(`${url.origin}/dashboard?payment=${status}`);
  } catch (error) {
    console.error("[pesapal-callback]", error);
    return redirectTo(`${url.origin}/dashboard?payment=error`);
  }
}

export const Route = createFileRoute("/api/pesapal/callback")({
  server: {
    handlers: {
      GET: ({ request }) => handleCallback(request),
    },
  },
});
