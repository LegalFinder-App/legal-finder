import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TaskSetupMFA, useClerk } from "@clerk/tanstack-react-start";
import { Logo } from "@/components/brand/logo";

// Clerk routes here (via ClerkProvider's taskUrls in __root.tsx) when a freshly signed-in session
// is still pending a setup-mfa task. Finishing it makes the session active; /auth then does the
// usual role-based redirect, so that logic isn't duplicated here.
export const Route = createFileRoute("/session-tasks/setup-mfa")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Secure your account — LegalFinder" }, { name: "robots", content: "noindex" }],
  }),
  component: SetupMfaTask,
});

function SetupMfaTask() {
  const clerk = useClerk();
  const navigate = useNavigate();

  // TaskSetupMFA redirects itself when MFA is finished through its own UI, but a session can also
  // become active another way (reload after enrolling, enrolling in another tab) and the component
  // then just sits there. Move on whenever the session is no longer pending.
  useEffect(() => {
    const continueIfActive = (session: typeof clerk.session) => {
      if (session?.status === "active") navigate({ to: "/auth", replace: true });
    };
    continueIfActive(clerk.session);
    return clerk.addListener(({ session }) => continueIfActive(session));
  }, [clerk, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-12">
      <Link to="/" className="mb-8">
        <Logo />
      </Link>
      <div className="mb-6 max-w-md text-center">
        <h1 className="font-display text-3xl font-semibold">Secure your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          LegalFinder protects case files and messages with two-step verification. Set it up once
          with an authenticator app, then you'll go straight to your workspace.
        </p>
      </div>
      <TaskSetupMFA redirectUrlComplete="/auth" />
    </div>
  );
}
