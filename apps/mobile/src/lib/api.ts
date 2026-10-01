import { env } from "./env";
import { getAuthToken } from "./auth-token";
import { bridgedFetch } from "./bridged-fetch";

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
    const message =
      payload && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
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
};
