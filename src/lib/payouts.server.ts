// Server-only: pays a lawyer out for a completed consultation payment via Flutterwave. Called
// from pesapal.server.ts's finalizePayment right after a payment is confirmed, and from the
// admin "Retry payout" action (src/lib/payouts.functions.ts). Only import this from other
// .server.ts modules or dynamically inside route/*.functions.ts handlers.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppDatabase, PayoutStatus } from "@/integrations/supabase/app-database";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { LawyerPayoutAccount } from "@/lib/lawyer-payout";
import { transactionConfirmsPayment } from "@/lib/payment-verification";

// lawyer_payout_accounts isn't in AppDatabase (see src/lib/lawyer-payout.ts) — same narrowed
// cast, applied to the service-role client here.
const payoutAccountAdminClient = supabaseAdmin as unknown as {
  from: (table: "lawyer_payout_accounts") => {
    select: (columns: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        maybeSingle: () => Promise<{
          data: LawyerPayoutAccount | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

function splitName(fullName: string | null | undefined): { first: string; last: string } {
  const trimmed = (fullName ?? "").trim();
  if (!trimmed) return { first: "Advocate", last: "Payout" };
  const parts = trimmed.split(/\s+/);
  return { first: parts[0], last: parts.slice(1).join(" ") || parts[0] };
}

async function recordPayoutFailure(paymentId: string, reason: string) {
  await supabaseAdmin
    .from("payments")
    .update({ payout_status: "failed", payout_failure_reason: reason })
    .eq("id", paymentId);
}

/**
 * Idempotent: safe to call more than once for the same payment (finalizePayment runs from both
 * the Pesapal IPN and browser-callback routes, and this is also re-invoked by the admin "Retry
 * payout" action). No-ops if the payment has no lawyer, hasn't been paid by the client, is
 * already processing/completed, or there's no payout account on file yet (leaves payout_status =
 * 'pending' for that case — the admin Payouts panel surfaces it as "awaiting lawyer payout
 * setup").
 */
export async function attemptLawyerPayout(paymentId: string): Promise<void> {
  const { data: payment, error } = await supabaseAdmin
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!payment || !payment.lawyer_id) return;
  // Never pay out money that hasn't arrived: every advocate-linked payment starts with
  // payout_status 'pending' (trg_payments_default_payout_status), paid or not, so that status
  // alone doesn't mean the client's payment cleared.
  if (payment.status !== "completed") return;
  if (payment.payout_status === "processing" || payment.payout_status === "completed") return;

  // Only a payment that went through our Pesapal checkout can have brought money in. A row whose
  // status a client set themselves has no tracking id from us (see also the Pesapal check below).
  if (!payment.pesapal_order_tracking_id) {
    await recordPayoutFailure(paymentId, "No Pesapal payment is on record for this consultation.");
    return;
  }

  const { data: payoutAccount } = await payoutAccountAdminClient
    .from("lawyer_payout_accounts")
    .select("*")
    .eq("lawyer_user_id", payment.lawyer_id)
    .maybeSingle();

  if (!payoutAccount) {
    await supabaseAdmin.from("payments").update({ payout_status: "pending" }).eq("id", paymentId);
    return;
  }

  // Claim the payout in one conditional update. The IPN and the browser callback usually arrive
  // together; only the call whose update still finds 'pending'/'failed' goes on to Flutterwave.
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("payments")
    .update({ payout_status: "processing", payout_failure_reason: null })
    .eq("id", paymentId)
    .in("payout_status", ["pending", "failed"])
    .select("id");
  if (claimError) throw new Error(claimError.message);
  if (!claimed?.length) return;

  // Ask Pesapal again, right before money leaves: our own row could have been altered since.
  try {
    const { getTransactionStatus } = await import("@/lib/pesapal.server");
    const transaction = await getTransactionStatus(payment.pesapal_order_tracking_id);
    if (!transactionConfirmsPayment(transaction, payment)) {
      await recordPayoutFailure(
        paymentId,
        "Pesapal doesn't confirm this payment for this amount, so nothing was paid out.",
      );
      return;
    }
  } catch (err) {
    await recordPayoutFailure(
      paymentId,
      `Couldn't confirm the client's payment with Pesapal: ${err instanceof Error ? err.message : "unknown error"}`,
    );
    return;
  }

  const { data: lawyer } = await supabaseAdmin
    .from("lawyers")
    .select("full_name")
    .eq("user_id", payment.lawyer_id)
    .maybeSingle();
  const { first, last } = splitName(lawyer?.full_name);

  const appUrl = (process.env.VITE_APP_URL || "https://legalfinder.co").replace(/\/$/, "");

  try {
    const { submitTransfer } = await import("@/lib/flutterwave.server");
    const result = await submitTransfer({
      reference: payment.id,
      narration: `LegalFinder consultation fee — ${payment.description ?? "consultation"}`,
      amount: Number(payment.amount),
      sourceCurrency: payment.currency,
      destinationCurrency: payment.currency,
      callbackUrl: `${appUrl}/api/flutterwave/webhook`,
      recipient: {
        method: payoutAccount.method,
        firstName: first,
        lastName: last,
        currency: payment.currency,
        mobileNetwork: payoutAccount.mobile_network,
        phoneNumber: payoutAccount.phone_number,
        bankCode: payoutAccount.bank_code,
        accountNumber: payoutAccount.account_number,
        accountName: payoutAccount.account_name,
      },
    });

    // Status stays 'processing' — Flutterwave confirms completion async via the webhook, which
    // re-verifies through getTransferStatus before ever marking a payment 'completed'.
    await supabaseAdmin
      .from("payments")
      .update({
        flutterwave_transfer_id: result.transferId,
        flutterwave_transfer_reference: result.reference,
      })
      .eq("id", paymentId);
  } catch (err) {
    await recordPayoutFailure(paymentId, err instanceof Error ? err.message : "Unknown error");
  }
}

export type PayoutRetryResult = { payoutStatus: PayoutStatus; failureReason: string | null };

/**
 * The admin "Retry payout" action, shared by the web's retryLawyerPayout server function and the
 * app's /api/mobile/payouts/retry route. Re-attempts a payment whose payout is 'pending' (the
 * advocate hadn't set up payout details yet) or 'failed' (a transient Flutterwave error), and
 * reports where the payout stands afterwards. Checks the role explicitly, not through RLS — same
 * pattern as src/lib/admin-users.functions.ts — because the payout runs with the service role.
 */
export async function retryLawyerPayoutAsAdmin(
  caller: { supabase: SupabaseClient<AppDatabase>; userId: string },
  paymentId: string,
): Promise<PayoutRetryResult> {
  const { data: callerRoles, error: roleError } = await caller.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.userId);
  if (roleError) throw new Error(roleError.message);
  if (!callerRoles?.some((row) => row.role === "admin")) {
    throw new Error("Only administrators can do this.");
  }

  const { data: payment, error } = await supabaseAdmin
    .from("payments")
    .select("status")
    .eq("id", paymentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!payment) throw new Error("That payment no longer exists.");
  if (payment.status !== "completed") {
    throw new Error("The client's payment hasn't completed, so there is nothing to pay out yet.");
  }

  await attemptLawyerPayout(paymentId);

  const { data: after, error: afterError } = await supabaseAdmin
    .from("payments")
    .select("payout_status, payout_failure_reason")
    .eq("id", paymentId)
    .maybeSingle();
  if (afterError) throw new Error(afterError.message);
  return {
    payoutStatus: after?.payout_status ?? "pending",
    failureReason: after?.payout_failure_reason ?? null,
  };
}
