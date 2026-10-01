import { useEffect } from "react";
import { router, useRootNavigationState } from "expo-router";
import { desktop } from "./desktop";

/** "legalfinder://lawyers/123?tab=reviews" → "/lawyers/123?tab=reviews" */
function routeFromDeepLink(url: string): string | null {
  const match = /^legalfinder:\/\/\/?([^?#]*)(\?[^#]*)?/i.exec(url);
  if (!match) return null;
  const path = match[1].replace(/\/+$/, "");
  // Browser returns that arrived after their flow had already ended (the user came back to the
  // app first): a payment's result lives on Payments; a late sign-in return has nothing to show.
  if (path === "payment-result") return "/payments";
  if (path === "sso-callback") return null;
  return `/${path}${match[2] ?? ""}`;
}

/**
 * Desktop app only: opens legalfinder:// links handed over by the OS, including the one that
 * launched the app. Does nothing on phones, where the router receives links itself.
 */
export function useDesktopDeepLinks() {
  const navigationReady = Boolean(useRootNavigationState()?.key);

  useEffect(() => {
    if (!desktop || !navigationReady) return;
    const open = (url: string | null) => {
      const route = url ? routeFromDeepLink(url) : null;
      if (route) router.push(route as never);
    };
    void desktop.launchDeepLink().then(open);
    return desktop.onDeepLink(open);
  }, [navigationReady]);
}
