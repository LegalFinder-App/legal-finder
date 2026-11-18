import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TaskSetupMFA, useClerk } from "@clerk/tanstack-react-start";
import { KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { legalFinderClerkAppearance } from "@/lib/clerk-appearance";

// Clerk routes here (via ClerkProvider's taskUrls in __root.tsx) when a freshly signed-in session
// is still pending a setup-mfa task. Finishing it makes the session active; /auth then does the
// usual role-based redirect, so that logic isn't duplicated here.
export const Route = createFileRoute("/session-tasks/setup-mfa")({
  ssr: false,
  head: () => ({
    meta: [{ title: "LegalFinder | Secure your account" }, { name: "robots", content: "noindex" }],
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
        LegalFinder protects case files and messages with two-step verification. Set it up once,
        then you&apos;ll go straight to your workspace.
      </p>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        <li className="flex items-start gap-2.5 rounded-2xl border border-border bg-secondary/50 px-3 py-2.5">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-brass">
            <KeyRound className="h-4 w-4" aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-semibold">Authenticator app</span>
            <span className="text-[0.72rem] leading-snug text-muted-foreground">
              Google Authenticator, Authy, or similar
            </span>
          </span>
        </li>
        <li className="flex items-start gap-2.5 rounded-2xl border border-border bg-secondary/50 px-3 py-2.5">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-brass">
            <Smartphone className="h-4 w-4" aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-semibold">SMS code</span>
            <span className="text-[0.72rem] leading-snug text-muted-foreground">
              A one-time code to your phone
            </span>
          </span>
        </li>
      </ul>

      <div className="lf-clerk-mfa mt-6">
        <TaskSetupMFA appearance={legalFinderClerkAppearance} redirectUrlComplete="/auth" />
      </div>
    </AuthShell>
  );
}
