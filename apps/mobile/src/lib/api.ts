import type { PayoutStatus } from "@/types/app-database";
import { env } from "./env";
import { getAuthToken } from "./auth-token";
import { bridgedFetch } from "./bridged-fetch";
import type { DocumentRow } from "./queries";

// TanStack Start's answer to a JSON request for a path it has no route for (status 500).
const ROUTE_MISSING = "Only HTML requests are supported here";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/**
 * Calls the web app's /api/mobile/* endpoints — the native counterparts of its server functions
 * (payments, AI assistant, uploads, account deletion). The Clerk session token goes in the
 * Authorization header; the server verifies it the same way it verifies a browser session.
 * (bridgedFetch is plain fetch on phones; the desktop app routes it through its shell.)
 */
export async function apiPost<T>(path: string, body: unknown = {}): Promise<T> {
  const token = await getAuthToken();
  if (!token) throw new ApiError("Please sign in to continue.", 401);

  let response: Response;
  try {
    response = await bridgedFetch(`${env.apiUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("You appear to be offline. Check your connection and try again.", 0);
  }

  const payload = (await response.json().catch(() => null)) as
    (T & { error?: undefined }) | { error: string } | null;

  if (!response.ok) {
    const serverMessage =
      payload && "error" in payload && typeof payload.error === "string" ? payload.error : null;
    // An app release can reach users before the website's deployment does, and then the route
    // simply isn't there: a bare 404, or (from a server older than api.mobile.$.tsx) the
    // framework's own complaint about a non-HTML request. Neither means anything to a user.
    const routeMissing =
      serverMessage === ROUTE_MISSING || (response.status === 404 && !serverMessage);
    const message = routeMissing
      ? "This isn't available on the LegalFinder server yet. Please try again later."
      : (serverMessage ?? `Request failed (${response.status})`);
    throw new ApiError(message, routeMissing ? 404 : response.status);
  }
  return payload as T;
}

export const api = {
  /** Provisions the profile/default role on first sign-in and returns the caller's roles. */
  session: () => apiPost<{ userId: string; roles: string[] }>("/api/mobile/session"),
  askAssistant: (messages: { role: "user" | "assistant"; content: string }[]) =>
    apiPost<{ reply: string }>("/api/mobile/assistant", { messages }),
  startPayment: (paymentId: string) =>
    apiPost<{ redirectUrl: string }>("/api/mobile/payments/initiate", { paymentId }),
  imageUploadAuth: (extension: string, purpose: "profile" | "content" = "profile") =>
    apiPost<{
      token: string;
      expire: number;
      signature: string;
      publicKey: string;
      urlEndpoint: string;
      folder: string;
      fileName: string;
    }>("/api/mobile/uploads/image-auth", { extension, purpose }),
  registerPushToken: (token: string, platform: string, deviceName: string | null) =>
    apiPost<{ ok: true }>("/api/mobile/push/register", { token, platform, deviceName }),
  unregisterPushToken: (token: string) =>
    apiPost<{ ok: true }>("/api/mobile/push/unregister", { token }),
  deleteAccount: () => apiPost<{ ok: true }>("/api/mobile/account/delete"),
  /** Admin only. Re-attempts an advocate's payout and reports where it stands afterwards. */
  retryPayout: (paymentId: string) =>
    apiPost<{ payoutStatus: PayoutStatus; failureReason: string | null }>(
      "/api/mobile/payouts/retry",
      { paymentId },
    ),
  documentTemplates: () =>
    apiPost<{ templates: DocumentTemplate[] }>("/api/mobile/documents/templates"),
  /** Renders the PDF on the server and files it in the caller's vault; returns the new row. */
  generateDocument: (request: GenerateDocumentRequest) =>
    apiPost<{ document: DocumentRow }>("/api/mobile/documents/generate", request),
  draftDocument: (request: { documentType: string; instructions: string; existingText?: string }) =>
    apiPost<{ draftText: string }>("/api/mobile/documents/draft", request),
};

// Mirrors src/lib/documents/templates/types.ts on the web, minus the PDF layout (server-side).
export interface DocumentTemplateField {
  name: string;
  label: string;
  type: "text" | "textarea" | "date" | "number";
  placeholder?: string;
  optional?: boolean;
}

export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  fields: DocumentTemplateField[];
}

export type GenerateDocumentRequest =
  | { kind: "template"; caseId?: string | null; templateId: string; values: Record<string, string> }
  | { kind: "draft"; caseId?: string | null; title: string; bodyText: string };
