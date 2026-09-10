import { createFileRoute } from "@tanstack/react-router";

// Server-only Flutterwave/Supabase modules are dynamically imported inside the handler below —
// this route file is dual-purpose (it also exists in the client route tree), so secret-touching
// deps must not load at module scope. Same shape as api.pesapal.ipn.tsx.
async function handleWebhook(request: Request) {
  // Confirm against Flutterwave's dashboard webhook settings which header name/scheme is
  // actually in use for this account — see FLUTTERWAVE_SETUP_NOTES in flutterwave.server.ts.
  const signature =
    request.headers.get("flutterwave-signature") ?? request.headers.get("verif-hash");

  const { verifyWebhookSignature } = await import("@/lib/flutterwave.server");
  if (!verifyWebhookSignature(signature)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let transferId: string | undefined;
  try {
    const body = (await request.json()) as { data?: { id?: string } };
    transferId = body.data?.id;
  } catch {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!transferId) {
    return Response.json({ error: "Missing transfer id" }, { status: 400 });
  }

  try {
    // Re-verify against Flutterwave's own API rather than trusting the webhook payload's status
    // outright — same defense-in-depth as pesapal.server.ts's finalizePayment.
    const { getTransferStatus } = await import("@/lib/flutterwave.server");
    const status = await getTransferStatus(transferId);
    if (status === "pending") {
      return Response.json({ received: true, status });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("payments")
      .update({
        payout_status: status,
        paid_out_at: status === "completed" ? new Date().toISOString() : null,
        payout_failure_reason: status === "failed" ? "Flutterwave transfer failed" : null,
      })
      .eq("flutterwave_transfer_id", transferId);

    if (error) throw new Error(error.message);
    return Response.json({ received: true, status });
  } catch (error) {
    console.error("[flutterwave-webhook]", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/flutterwave/webhook")({
  server: {
    handlers: {
      POST: ({ request }) => handleWebhook(request),
    },
  },
});
