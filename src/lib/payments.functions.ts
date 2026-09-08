import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireClerkAuth } from "@/integrations/supabase/auth-middleware";

const initiateSchema = z.object({ paymentId: z.string().uuid() });

/**
 * Registers the Pesapal order for an already-created (pending) payment row and returns the
 * hosted-page redirect URL. Pesapal SDK modules are dynamically imported — route/*.functions.ts
 * files are dual-purpose (client stub + server handler) and must not load server-only deps
 * at module scope.
 */
export const initiatePesapalPayment = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .validator(initiateSchema)
  .handler(async ({ context, data }) => {
    const { data: payment, error } = await context.supabase
      .from("payments")
      .select("*")
      .eq("id", data.paymentId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!payment) throw new Error("Payment not found.");
    if (payment.client_id !== context.userId) {
      throw new Error("You don't have access to this payment.");
    }
    if (payment.status === "completed") {
      throw new Error("This payment has already been completed.");
    }

    // Defense in depth: RLS only checks client_id on insert, so a client could otherwise submit
    // an arbitrary `amount` for a real advocate's fee. Re-verify against the lawyer's actual
    // consultation_fee before ever telling Pesapal how much to charge.
    if (payment.lawyer_id) {
      const { data: lawyerRow, error: lawyerError } = await context.supabase
        .from("lawyers")
        .select("consultation_fee")
        .eq("user_id", payment.lawyer_id)
        .maybeSingle();
      if (lawyerError) throw new Error(lawyerError.message);
      if (
        lawyerRow?.consultation_fee != null &&
        Number(payment.amount) !== Number(lawyerRow.consultation_fee)
      ) {
        throw new Error("This payment amount no longer matches the advocate's consultation fee.");
      }
    }

    const appUrl = (process.env.VITE_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const callbackUrl = `${appUrl}/api/pesapal/callback`;
    const ipnUrl = `${appUrl}/api/pesapal/ipn`;

    const { getIpnId, submitOrder } = await import("@/lib/pesapal.server");
    const ipnId = await getIpnId(ipnUrl);

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();

    const order = await submitOrder({
      merchantReference: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      description: payment.description ?? "LegalFinder consultation fee",
      callbackUrl,
      ipnId,
      billing: {
        emailAddress: profile?.email ?? undefined,
      },
    });

    // Written via the service role: clients may only INSERT their own payment row, not update it —
    // status/order-tracking fields are server-controlled from here on.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: updateError } = await supabaseAdmin
      .from("payments")
      .update({
        pesapal_order_tracking_id: order.orderTrackingId,
        pesapal_merchant_reference: order.merchantReference,
      })
      .eq("id", payment.id);
    if (updateError) throw new Error(updateError.message);

    return { redirectUrl: order.redirectUrl };
  });
