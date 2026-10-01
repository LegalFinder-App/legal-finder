import { api } from "./api";
import { openBrowserSession } from "./browser-session";
import { supabase } from "./supabase";

export type PaymentOutcome = "completed" | "failed" | "pending" | "cancelled";

const RETURN_URL = "legalfinder://payment-result";

/**
 * Opens Pesapal's hosted checkout in a browser session. The web server's
 * /api/pesapal/callback-mobile finalizes the payment and sends the payer back to
 * legalfinder://payment-result, which ends the session. The status shown to the user is always
 * re-read from the payments row (written server-side by the callback/IPN) — never taken from the
 * redirect URL.
 */
export async function payForPayment(paymentId: string): Promise<PaymentOutcome> {
  const { redirectUrl } = await api.startPayment(paymentId);
  const outcome = await openBrowserSession(redirectUrl, RETURN_URL);

  // The IPN can land a moment after the redirect; give it a few short chances to settle.
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data } = await supabase
      .from("payments")
      .select("status")
      .eq("id", paymentId)
      .maybeSingle();
    const status = data?.status;
    if (status === "completed" || status === "failed") return status;
    if (attempt < 3) await new Promise((r) => setTimeout(r, 1500));
  }
  return outcome === "returned" ? "pending" : "cancelled";
}
