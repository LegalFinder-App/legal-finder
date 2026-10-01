import * as WebBrowser from "expo-web-browser";

/**
 * Opens a page in the in-app browser sheet and waits for it to come back to `returnUrl`
 * ("returned") or be closed ("dismissed"). The desktop build does the same through the system
 * browser (browser-session.web.ts).
 */
export async function openBrowserSession(
  url: string,
  returnUrl: string,
): Promise<"returned" | "dismissed"> {
  const result = await WebBrowser.openAuthSessionAsync(url, returnUrl);
  return result.type === "success" ? "returned" : "dismissed";
}
