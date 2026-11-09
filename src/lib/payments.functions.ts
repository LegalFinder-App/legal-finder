import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimited } from "@/lib/rate-limit-middleware";
import type { AppDatabase } from "@/integrations/supabase/app-database";

export const initiateSchema = z.object({ paymentId: z.string().uuid() });

type PaymentRow = AppDatabase["public"]["Tables"]["payments"]["Row"];

// Pulled out of the handler below so the two defense-in-depth checks — ownership and
// server-side fee re-verification — are directly unit-testable without going through
// createServerFn's request-handling machinery.
export function assertPaymentInitiatable(
  payment: PaymentRow | null,
  userId: string,
): asserts payment is PaymentRow {
  if (!payment) throw new Error("Payment not found.");
  if (payment.client_id !== userId) {
    throw new Error("You don't have access to this payment.");
  }
  if (payment.status === "completed") {
    throw new Error("This payment has already been completed.");
  }
}

// RLS only checks client_id on insert, so a client could otherwise submit an arbitrary `amount`
// for a real advocate's fee. Re-verify against the lawyer's actual consultation_fee before ever
// telling Pesapal how much to charge.
export function assertAmountMatchesConsultationFee(
  amount: number,
  consultationFee: number | null | undefined,
): void {
  if (consultationFee != null && amount !== Number(consultationFee)) {
    throw new Error("This payment amount no longer matches the advocate's consultation fee.");
  }
}

/**
 * Registers the Pesapal order for an already-created (pending) payment row and returns the
 * hosted-page redirect URL. The checkout itself lives in payments.server.ts (dynamically imported —
 * functions files are dual-purpose and must not load server-only deps at module scope), shared with
 * the mobile app's /api/mobile/payments/initiate route.
 */
export const initiatePesapalPayment = createServerFn({ method: "POST" })
  .middleware([rateLimited("payments")])
  .validator(initiateSchema)
  .handler(async ({ context, data }) => {
    const { startPesapalCheckout } = await import("@/lib/payments.server");
    return startPesapalCheckout({
      supabase: context.supabase,
      userId: context.userId,
      paymentId: data.paymentId,
      callbackPath: "/api/pesapal/callback",
    });
  });
