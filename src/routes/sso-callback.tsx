import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HandleSSOCallback } from "@clerk/tanstack-react-start";

// Where Clerk's OAuth redirect (Google / Apple / LinkedIn) lands when the Future `signIn.sso`
// flow needs the handshake page (`redirectCallbackUrl`). HandleSSOCallback finishes the
// sign-in/sign-up and routes back to /auth, which already opens MFA and the role-based workspace.
export const Route = createFileRoute("/sso-callback")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: SsoCallbackPage,
});

function SsoCallbackPage() {
  const navigate = useNavigate();

  const goAuth = () => {
    void navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
      <HandleSSOCallback
        navigateToApp={({ session, decorateUrl }) => {
          if (session?.currentTask?.key === "setup-mfa") {
            const destination = decorateUrl("/session-tasks/setup-mfa");
            if (destination.startsWith("http")) {
              window.location.href = destination;
              return;
            }
            void navigate({ to: "/session-tasks/setup-mfa", replace: true });
            return;
          }
          // /auth already runs navigateAfterAuth once isSignedIn flips.
          const destination = decorateUrl("/auth");
          if (destination.startsWith("http")) {
            window.location.href = destination;
            return;
          }
          void navigate({ to: "/auth", replace: true });
        }}
        // MFA / missing fields / transfer — /auth already opens the code step and sign-up continue UI.
        navigateToSignIn={goAuth}
        navigateToSignUp={goAuth}
      />
      <p>Finishing sign-in…</p>
    </div>
  );
}
