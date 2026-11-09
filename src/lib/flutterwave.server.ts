// Server-only Flutterwave Direct Transfers client — pays a lawyer out for a completed
// consultation payment. Only import this from other .server.ts modules, or dynamically inside
// route/*.functions.ts handlers (same rule as src/lib/pesapal.server.ts).
//
// Sourced from Flutterwave's current API reference (developer.flutterwave.com) as of this
// writing. Two things are inferred rather than directly confirmed and MUST be checked against
// the sandbox before going live (see FLUTTERWAVE_SETUP_NOTES below):
//   1. The bank-recipient request shape — only the mobile_money recipient shape was shown in
//      the docs fetched during implementation; the bank shape here follows the same pattern.
//   2. The exact `mobile_money.network` string Uganda expects ("MTN"/"AIRTEL" here, matching
//      the confirmed Ghana example's use of real operator names — one source also showed "MPS"
//      in an unrelated test-scenario name, which may or may not be the real value).
//   3. The webhook signature: Flutterwave's docs describe both "compare header against your
//      secret hash" and "HMAC-SHA256 of the body" in the same paragraph — verifySignature()
//      below does a plain string comparison (the more commonly documented real-world behavior);
//      confirm this against your dashboard's webhook settings before relying on it.
import { secretsMatch } from "@/lib/secure-compare.server";

export const FLUTTERWAVE_SETUP_NOTES =
  "Confirm against the Flutterwave sandbox: bank-recipient field shape, Uganda mobile_money.network value, and webhook signature scheme.";

function baseUrl() {
  return process.env.FLUTTERWAVE_ENV === "live"
    ? "https://api.flutterwave.com"
    : "https://developersandbox-api.flutterwave.com";
}

function secretKey(): string {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Lawyer payouts aren't configured yet. Ask an administrator to set FLUTTERWAVE_SECRET_KEY.",
    );
  }
  return key;
}

export interface TransferRecipient {
  method: "mobile_money" | "bank";
  firstName: string;
  lastName: string;
  currency: string; // e.g. "UGX"
  /** mobile_money only */
  mobileNetwork?: string | null;
  phoneNumber?: string | null;
  /** bank only */
  bankCode?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
}

export interface SubmitTransferInput {
  reference: string; // payment.id — also the idempotency key
  narration: string;
  amount: number;
  sourceCurrency: string;
  destinationCurrency: string;
  callbackUrl: string;
  recipient: TransferRecipient;
}

export interface SubmitTransferResult {
  transferId: string;
  reference: string;
  status: string;
}

function buildRecipientPayload(recipient: TransferRecipient) {
  const name = { first: recipient.firstName, last: recipient.lastName };

  if (recipient.method === "mobile_money") {
    return {
      type: "mobile_money" as const,
      name,
      currency: recipient.currency,
      mobile_money: {
        network: recipient.mobileNetwork,
        country: "UG",
        msisdn: recipient.phoneNumber,
      },
    };
  }

  // Bank shape inferred from the mobile_money pattern — confirm against the sandbox
  // (see FLUTTERWAVE_SETUP_NOTES above) before relying on this in production.
  return {
    type: "bank" as const,
    name,
    currency: recipient.currency,
    bank: {
      country: "UG",
      code: recipient.bankCode,
      account_number: recipient.accountNumber,
      account_name: recipient.accountName,
    },
  };
}

export async function submitTransfer(input: SubmitTransferInput): Promise<SubmitTransferResult> {
  const response = await fetch(`${baseUrl()}/direct-transfers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Trace-Id": `legalfinder-payout-${input.reference}`,
      "X-Idempotency-Key": `legalfinder-payout-${input.reference}`,
    },
    body: JSON.stringify({
      reference: input.reference,
      narration: input.narration,
      action: "instant",
      transfer_purpose: "professional_services",
      callback_url: input.callbackUrl,
      source_currency: input.sourceCurrency,
      destination_currency: input.destinationCurrency,
      amount: { value: input.amount, applies_to: "destination_currency" },
      recipient: buildRecipientPayload(input.recipient),
    }),
  });

  const payload = (await response.json()) as {
    status?: string;
    message?: string;
    error?: { message?: string; validation_errors?: { field_name: string; message: string }[] };
    data?: { id?: string; reference?: string; status?: string };
  };

  if (!response.ok || payload.status !== "success" || !payload.data?.id) {
    const validation = payload.error?.validation_errors
      ?.map((e) => `${e.field_name}: ${e.message}`)
      .join("; ");
    throw new Error(
      validation || payload.error?.message || payload.message || "Unable to submit the transfer.",
    );
  }

  return {
    transferId: payload.data.id,
    reference: payload.data.reference ?? input.reference,
    status: payload.data.status ?? "PENDING",
  };
}

export type TransferStatus = "pending" | "completed" | "failed";

function normalizeStatus(status: string | undefined): TransferStatus {
  const normalized = (status ?? "").toUpperCase();
  if (normalized === "SUCCESSFUL") return "completed";
  if (normalized === "FAILED" || normalized === "CANCELLED") return "failed";
  return "pending";
}

export async function getTransferStatus(transferId: string): Promise<TransferStatus> {
  const response = await fetch(`${baseUrl()}/transfers/${encodeURIComponent(transferId)}`, {
    headers: { Authorization: `Bearer ${secretKey()}`, Accept: "application/json" },
  });
  const payload = (await response.json()) as {
    status?: string;
    data?: { status?: string };
    message?: string;
  };

  if (!response.ok) {
    throw new Error(payload.message ?? "Unable to fetch the transfer status.");
  }

  return normalizeStatus(payload.data?.status);
}

/**
 * Plain string comparison against the secret hash configured on the Flutterwave dashboard —
 * see the module-level FLUTTERWAVE_SETUP_NOTES caveat about the verification scheme.
 */
export function verifyWebhookSignature(headerValue: string | null): boolean {
  return secretsMatch(headerValue, process.env.FLUTTERWAVE_WEBHOOK_HASH);
}
