import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useSSO } from "@clerk/expo";

// Completes the in-app browser session when Clerk redirects back to legalfinder://sso-callback.
WebBrowser.maybeCompleteAuthSession();

export type SocialStrategy = "oauth_google" | "oauth_apple" | "oauth_linkedin_oidc";
/** "cancelled" = the user closed the browser; there is nothing to report. */
export type SocialSignInResult = "signed-in" | "needs-second-factor" | "cancelled";

/**
 * Google / Apple / LinkedIn through Clerk's hosted OAuth in the system auth session
 * (ASWebAuthenticationSession / Custom Tabs) — Google blocks its sign-in page inside embedded
 * WebViews. The desktop build does the same hand-off through the system browser
 * (social-sign-in.web.ts).
 */
export function useSocialSignIn() {
  const { startSSOFlow } = useSSO();

  return async (strategy: SocialStrategy): Promise<SocialSignInResult> => {
    const redirectUrl = AuthSession.makeRedirectUri({
      scheme: "legalfinder",
      path: "sso-callback",
    });
    const { createdSessionId, setActive, signIn } = await startSSOFlow({ strategy, redirectUrl });
    if (createdSessionId && setActive) {
      await setActive({ session: createdSessionId });
      return "signed-in";
    }
    return signIn?.status === "needs_second_factor" ? "needs-second-factor" : "cancelled";
  };
}

/** Phones know when the browser sheet closes, so there is nothing to cancel by hand. */
export const cancelSocialSignIn: (() => void) | null = null;
