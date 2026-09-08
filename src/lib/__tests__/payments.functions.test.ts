import { describe, expect, it } from "vitest";
import {
  assertAmountMatchesConsultationFee,
  assertPaymentInitiatable,
} from "../payments.functions";
import type { AppDatabase } from "@/integrations/supabase/app-database";

type PaymentRow = AppDatabase["public"]["Tables"]["payments"]["Row"];

function makePayment(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: "payment-1",
    appointment_id: null,
    client_id: "user_client",
    lawyer_id: "user_lawyer",
    amount: 5000,
    currency: "UGX",
    status: "pending",
    description: null,
    pesapal_order_tracking_id: null,
    pesapal_merchant_reference: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("assertPaymentInitiatable", () => {
  it("throws when the payment doesn't exist", () => {
    expect(() => assertPaymentInitiatable(null, "user_client")).toThrow("Payment not found.");
  });

  it("throws when the caller isn't the payment's client — no trusting client-supplied identity", () => {
    const payment = makePayment({ client_id: "user_client" });
    expect(() => assertPaymentInitiatable(payment, "user_someone_else")).toThrow(
      "You don't have access to this payment.",
    );
  });

  it("throws when the payment is already completed", () => {
    const payment = makePayment({ status: "completed" });
    expect(() => assertPaymentInitiatable(payment, "user_client")).toThrow(
      "This payment has already been completed.",
    );
  });

  it("does not throw for the owning client on a pending payment", () => {
    const payment = makePayment({ client_id: "user_client", status: "pending" });
    expect(() => assertPaymentInitiatable(payment, "user_client")).not.toThrow();
  });
});

describe("assertAmountMatchesConsultationFee", () => {
  it("throws when the submitted amount doesn't match the advocate's real fee", () => {
    // This is what stops a client from tampering with the payment amount before checkout —
    // RLS only checks who owns the row on insert, not what amount they wrote into it.
    expect(() => assertAmountMatchesConsultationFee(1, 5000)).toThrow(
      "This payment amount no longer matches the advocate's consultation fee.",
    );
  });

  it("does not throw when the amount matches", () => {
    expect(() => assertAmountMatchesConsultationFee(5000, 5000)).not.toThrow();
  });

  it("does not throw when the advocate has no consultation fee set", () => {
    expect(() => assertAmountMatchesConsultationFee(5000, null)).not.toThrow();
    expect(() => assertAmountMatchesConsultationFee(5000, undefined)).not.toThrow();
  });
});
