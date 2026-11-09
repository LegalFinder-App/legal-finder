// Shared by pesapal.server.ts (marking a payment paid) and payouts.server.ts (paying the advocate
// out). Kept free of server-only imports so both, and their tests, use the same rule.

export type PesapalTransaction = {
  status: "pending" | "completed" | "failed";
  amount: number | null;
  currency: string | null;
  merchantReference: string | null;
};

export type PaymentForVerification = {
  id: string;
  amount: number | string;
  currency: string;
  pesapal_merchant_reference: string | null;
};

/**
 * Pesapal's "completed" only counts for the payment the order was created for: the same reference
 * (our payment id is the merchant reference), the same amount and the same currency. A payment row
 * whose status or tracking id a client wrote themselves fails this, so it is never treated as paid
 * and never paid out.
 */
export function transactionConfirmsPayment(
  transaction: PesapalTransaction,
  payment: PaymentForVerification,
): boolean {
  if (transaction.status !== "completed") return false;

  const reference = payment.pesapal_merchant_reference ?? payment.id;
  if (transaction.merchantReference !== reference) return false;

  if (transaction.amount == null || Number(transaction.amount) !== Number(payment.amount)) {
    return false;
  }

  // Pesapal includes the currency; if it ever doesn't, the reference and amount still have to agree.
  if (
    transaction.currency &&
    transaction.currency.toUpperCase() !== payment.currency.toUpperCase()
  ) {
    return false;
  }
  return true;
}
