import { useSignIn, useSignUp } from "@clerk/react/legacy";
import { desktop } from "./desktop";

export type SocialStrategy = "oauth_google" | "oauth_apple" | "oauth_linkedin_oidc";
export type SocialSignInResult = "signed-in" | "needs-second-factor" | "cancelled";

// Same allow-listed return URL as the phones: the provider's page ends on legalfinder://sso-callback,
// the OS hands that link to the desktop shell, and the shell passes it back here.
const RETURN_URL = "legalfinder://sso-callback";

/**
 * Desktop counterpart of social-sign-in.ts — the same steps as @clerk/expo's useSSO, with the
 * system browser in place of the phone's in-app browser sheet.
 */
export function useSocialSignIn() {
  const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();

  return async (strategy: SocialStrategy): Promise<SocialSignInResult> => {
    if (!signInLoaded || !signUpLoaded) return "cancelled";
    if (!desktop) throw new Error("Social sign-in needs the LegalFinder desktop app.");

    await signIn.create({ strategy, redirectUrl: RETURN_URL });
    const providerUrl = signIn.firstFactorVerification.externalVerificationRedirectURL;
    if (!providerUrl) throw new Error("Sign-in couldn't start. Please try again.");

    const result = await desktop.authSession.start({
      url: providerUrl.toString(),
      returnUrl: RETURN_URL,
    });
    if (result.type !== "success") return "cancelled";

    const rotatingTokenNonce = new URL(result.url).searchParams.get("rotating_token_nonce") ?? "";
    await signIn.reload({ rotatingTokenNonce });
    // First time with this provider: the sign-in attempt turns into a sign-up.
    if (signIn.firstFactorVerification.status === "transferable") {
      await signUp.create({ transfer: true });
    }

    const sessionId = signUp.createdSessionId ?? signIn.createdSessionId;
    if (sessionId) {
      await setActive({ session: sessionId });
      return "signed-in";
    }
    return signIn.status === "needs_second_factor" ? "needs-second-factor" : "cancelled";
  };
}

/** The desktop app can't see the browser tab being closed, so the screen offers a Cancel. */
export const cancelSocialSignIn: (() => void) | null = desktop
  ? () => void desktop?.authSession.cancel()
  : null;
