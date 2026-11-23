import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useSSO } from "@clerk/expo";
import { isExpoGo } from "./runtime";

// Completes the in-app browser session when Clerk redirects back to legalfinder://sso-callback.
WebBrowser.maybeCompleteAuthSession();

export type SocialStrategy = "oauth_google" | "oauth_apple" | "oauth_linkedin_oidc";
/** "cancelled" = the user closed the browser; there is nothing to report. */
export type SocialSignInResult = "signed-in" | "needs-second-factor" | "cancelled";

/** Stable deep link — allowlist this exact URL in Clerk → Native applications → mobile SSO. */
export const NATIVE_SSO_REDIRECT = "legalfinder://sso-callback";

/**
 * Google / Apple / LinkedIn through Clerk's hosted OAuth in the system auth session.
 * Expo Go cannot complete this reliably (no custom scheme; tunnel exp:// URLs change every
 * session and aren't on Clerk's allowlist). Use email/password there; social works in
 * development / EAS builds after `legalfinder://sso-callback` is allowlisted.
 */
export function useSocialSignIn() {
  const { startSSOFlow } = useSSO();

  return async (strategy: SocialStrategy): Promise<SocialSignInResult> => {
    if (isExpoGo) {
      throw new Error(
        "Google, Apple and LinkedIn need a native LegalFinder build. In Expo Go, sign in with email and password.",
      );
    }

    // Prefer the stable custom scheme (native / dev client). Fall back to AuthSession only if needed.
    const redirectUrl =
      AuthSession.makeRedirectUri({
        scheme: "legalfinder",
        path: "sso-callback",
        native: NATIVE_SSO_REDIRECT,
      }) || NATIVE_SSO_REDIRECT;

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
