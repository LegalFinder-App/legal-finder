import { createFileRoute } from "@tanstack/react-router";

// Server-only Pesapal module is dynamically imported inside the handler below — this route file
// is dual-purpose (it also exists in the client route tree), so secret-touching deps must not
// load at module scope.
async function handleNotification(request: Request) {
  const url = new URL(request.url);
  const orderTrackingId = url.searchParams.get("OrderTrackingId");
  const merchantReference = url.searchParams.get("OrderMerchantReference");

  if (!orderTrackingId) {
    return Response.json({ error: "Missing OrderTrackingId" }, { status: 400 });
  }

  try {
    const { finalizePayment } = await import("@/lib/pesapal.server");
    await finalizePayment(orderTrackingId);

    return Response.json({
      orderNotificationType: "IPNCHANGE",
      orderTrackingId,
      orderMerchantReference: merchantReference ?? "",
      status: 200,
    });
  } catch (error) {
    // The route is public, so the detail goes to the logs, not back to the caller.
    console.error("[pesapal-ipn]", error);
    return Response.json({ error: "IPN processing failed" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/pesapal/ipn")({
  server: {
    handlers: {
      GET: ({ request }) => handleNotification(request),
      POST: ({ request }) => handleNotification(request),
    },
  },
});
