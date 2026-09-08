import { createFileRoute } from "@tanstack/react-router";
import { AuthenticateWithRedirectCallback } from "@clerk/tanstack-react-start";

// Where Clerk's OAuth redirect (e.g. Google) lands to complete the sign-in/sign-up. Both
// fallbacks point at /auth, which already redirects a signed-in user to their role-based
// workspace — reusing that logic instead of duplicating it here.
export const Route = createFileRoute("/sso-callback")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: () => (
    <AuthenticateWithRedirectCallback
      signInFallbackRedirectUrl="/auth"
      signUpFallbackRedirectUrl="/auth"
    />
  ),
});
