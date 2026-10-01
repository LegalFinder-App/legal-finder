import { desktop } from "./desktop";

/**
 * Desktop counterpart of browser-session.ts: the page opens in the user's own browser, and the
 * desktop shell reports when a legalfinder:// link comes back — or when the user returns to the
 * app without one, which counts as dismissed.
 */
export async function openBrowserSession(
  url: string,
  returnUrl: string,
): Promise<"returned" | "dismissed"> {
  if (!desktop) {
    globalThis.open(url, "_blank", "noopener");
    return "dismissed";
  }
  const result = await desktop.authSession.start({ url, returnUrl, resolveOnFocus: true });
  return result.type === "success" ? "returned" : "dismissed";
}
