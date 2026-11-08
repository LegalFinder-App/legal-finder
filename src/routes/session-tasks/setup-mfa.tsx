import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TaskSetupMFA, useClerk } from "@clerk/tanstack-react-start";
import { ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

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
    <AuthShell showcaseTitle="One extra step keeps your case files and messages safe.">
      <span className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-brass ring-1 ring-brass/15">
        <ShieldCheck className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="text-h3 font-bold">Secure your account</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        LegalFinder protects case files and messages with two-step verification. Set it up once with
        an authenticator app, then you'll go straight to your workspace.
      </p>
      <div className="mt-6 [&_.cl-card]:shadow-none [&_.cl-rootBox]:w-full">
        <TaskSetupMFA redirectUrlComplete="/auth" />
      </div>
    </AuthShell>
  );
}
