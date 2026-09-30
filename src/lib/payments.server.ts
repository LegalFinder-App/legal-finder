// Server-only. Pesapal checkout shared by the web's initiatePesapalPayment server function and the
// mobile app's /api/mobile/payments/initiate route. Only the callback path differs: the web returns
// to its dashboard, the app to a route that deep-links back into the native app.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppDatabase } from "@/integrations/supabase/app-database";
import {
  assertAmountMatchesConsultationFee,
  assertPaymentInitiatable,
} from "@/lib/payments.functions";

export async function startPesapalCheckout({
  supabase,
  userId,
  paymentId,
  callbackPath,
}: {
  supabase: SupabaseClient<AppDatabase>;
  userId: string;
  paymentId: string;
  callbackPath: "/api/pesapal/callback" | "/api/pesapal/callback-mobile";
}): Promise<{ redirectUrl: string }> {
  const { data: payment, error } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  assertPaymentInitiatable(payment, userId);

  if (payment.lawyer_id) {
    const { data: lawyerRow, error: lawyerError } = await supabase
      .from("lawyers")
      .select("consultation_fee")
      .eq("user_id", payment.lawyer_id)
      .maybeSingle();
    if (lawyerError) throw new Error(lawyerError.message);
    assertAmountMatchesConsultationFee(Number(payment.amount), lawyerRow?.consultation_fee);
  }

  const appUrl = (process.env.VITE_APP_URL || "https://legalfinder.co").replace(/\/$/, "");
  const callbackUrl = `${appUrl}${callbackPath}`;
  const ipnUrl = `${appUrl}/api/pesapal/ipn`;

  const { getIpnId, submitOrder } = await import("@/lib/pesapal.server");
  const ipnId = await getIpnId(ipnUrl);

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
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
}
