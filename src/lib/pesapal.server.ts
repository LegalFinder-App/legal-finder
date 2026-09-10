// Server-only Pesapal API v3 client. Only import this from other .server.ts modules, or
// dynamically (`await import(...)`) inside route/*.functions.ts handlers — those files are
// dual-purpose (client stub + server handler) and must not pull secret-touching code into
// the client bundle at module scope.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function baseUrl() {
  return process.env.PESAPAL_ENV === "live"
    ? "https://pay.pesapal.com/v3"
    : "https://cybqa.pesapal.com/pesapalv3";
}

function credentials() {
  const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) {
    throw new Error(
      "Payments aren't configured yet. Ask an administrator to set PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET.",
    );
  }
  return { consumerKey, consumerSecret };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const { consumerKey, consumerSecret } = credentials();
  const response = await fetch(`${baseUrl()}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ consumer_key: consumerKey, consumer_secret: consumerSecret }),
  });
  const payload = (await response.json()) as {
    token?: string;
    expiryDate?: string;
    error?: { message?: string } | null;
    message?: string;
  };

  if (!response.ok || !payload.token) {
    throw new Error(
      payload.error?.message ?? payload.message ?? "Unable to authenticate with Pesapal.",
    );
  }

  const expiresAt = Date.parse(payload.expiryDate ?? "") || Date.now() + 4 * 60 * 1000;
  cachedToken = { token: payload.token, expiresAt };
  return payload.token;
}

let cachedIpnId: string | null = null;

/** Registers the IPN URL once and caches the id in-process. Set PESAPAL_IPN_ID to skip
 * re-registration entirely (recommended in production, since serverless instances are ephemeral). */
export async function getIpnId(ipnUrl: string): Promise<string> {
  const configured = process.env.PESAPAL_IPN_ID;
  if (configured) return configured;
  if (cachedIpnId) return cachedIpnId;

  const token = await getAccessToken();
  const response = await fetch(`${baseUrl()}/api/URLSetup/RegisterIPN`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ url: ipnUrl, ipn_notification_type: "GET" }),
  });
  const payload = (await response.json()) as {
    ipn_id?: string;
    error?: { message?: string } | null;
    message?: string;
  };

  if (!response.ok || !payload.ipn_id) {
    throw new Error(
      payload.error?.message ?? payload.message ?? "Unable to register the Pesapal IPN URL.",
    );
  }

  cachedIpnId = payload.ipn_id;
  return payload.ipn_id;
}

export interface SubmitOrderInput {
  merchantReference: string;
  amount: number;
  currency: string;
  description: string;
  callbackUrl: string;
  ipnId: string;
  billing: {
    emailAddress?: string;
    phoneNumber?: string;
    firstName?: string;
    lastName?: string;
    countryCode?: string;
  };
}

export interface SubmitOrderResult {
  orderTrackingId: string;
  merchantReference: string;
  redirectUrl: string;
}

export async function submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
  const token = await getAccessToken();
  const response = await fetch(`${baseUrl()}/api/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      id: input.merchantReference,
      currency: input.currency,
      amount: input.amount,
      description: input.description,
      callback_url: input.callbackUrl,
      notification_id: input.ipnId,
      billing_address: {
        email_address: input.billing.emailAddress,
        phone_number: input.billing.phoneNumber,
        country_code: input.billing.countryCode ?? "UG",
        first_name: input.billing.firstName ?? "LegalFinder",
        last_name: input.billing.lastName ?? "Client",
      },
    }),
  });
  const payload = (await response.json()) as {
    order_tracking_id?: string;
    merchant_reference?: string;
    redirect_url?: string;
    error?: { message?: string } | null;
    message?: string;
  };

  if (!response.ok || !payload.redirect_url || !payload.order_tracking_id) {
    throw new Error(
      payload.error?.message ?? payload.message ?? "Unable to submit the Pesapal order.",
    );
  }

  return {
    orderTrackingId: payload.order_tracking_id,
    merchantReference: payload.merchant_reference ?? input.merchantReference,
    redirectUrl: payload.redirect_url,
  };
}

export type PesapalPaymentStatus = "pending" | "completed" | "failed";

export interface TransactionStatusResult {
  status: PesapalPaymentStatus;
  description: string;
  amount: number | null;
  paymentMethod: string | null;
  confirmationCode: string | null;
  merchantReference: string | null;
}

export async function getTransactionStatus(
  orderTrackingId: string,
): Promise<TransactionStatusResult> {
  const token = await getAccessToken();
  const response = await fetch(
    `${baseUrl()}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
  );
  const payload = (await response.json()) as {
    payment_status_description?: string;
    amount?: number;
    payment_method?: string;
    confirmation_code?: string;
    merchant_reference?: string;
    error?: { message?: string } | null;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? payload.message ?? "Unable to fetch Pesapal transaction status.",
    );
  }

  const description = payload.payment_status_description ?? "PENDING";
  const normalized = description.toUpperCase();
  const status: PesapalPaymentStatus =
    normalized === "COMPLETED"
      ? "completed"
      : normalized === "FAILED" || normalized === "INVALID"
        ? "failed"
        : "pending";

  return {
    status,
    description,
    amount: payload.amount ?? null,
    paymentMethod: payload.payment_method ?? null,
    confirmationCode: payload.confirmation_code ?? null,
    merchantReference: payload.merchant_reference ?? null,
  };
}

/**
 * Looks up the transaction with Pesapal and writes the resulting status to our `payments` row.
 * Shared by the IPN webhook and the browser-redirect callback — both routes run unauthenticated
 * (Pesapal/the browser, not a signed-in user), so this always uses the service role.
 */
export async function finalizePayment(orderTrackingId: string): Promise<PesapalPaymentStatus> {
  const result = await getTransactionStatus(orderTrackingId);

  const { data: payment, error } = await supabaseAdmin
    .from("payments")
    .update({ status: result.status, pesapal_order_tracking_id: orderTrackingId })
    .eq("pesapal_order_tracking_id", orderTrackingId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);

  // Fire the lawyer payout the instant Pesapal confirms the client's payment — never let a
  // payout failure surface as a payment-confirmation failure (attemptLawyerPayout catches its
  // own errors and records them on the payment row instead of throwing).
  if (result.status === "completed" && payment) {
    const { attemptLawyerPayout } = await import("@/lib/payouts.server");
    await attemptLawyerPayout(payment.id);
  }

  return result.status;
}
