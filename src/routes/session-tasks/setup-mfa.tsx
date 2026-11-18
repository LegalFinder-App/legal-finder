import { useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TaskSetupMFA, useClerk } from "@clerk/tanstack-react-start";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { continueAfterAuth } from "@/lib/after-auth";
import { legalFinderClerkAppearance } from "@/lib/clerk-appearance";
import { toast } from "@/lib/toast";

// Clerk routes here (via ClerkProvider's taskUrls in __root.tsx) when a freshly signed-in session
// is still pending a setup-mfa task. Finishing it makes the session active; we then send the
// user straight to their role home (not a bounce through /auth).
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
  const queryClient = useQueryClient();
  const finishing = useRef(false);

  useEffect(() => {
    const finishIfActive = async (session: typeof clerk.session) => {
      if (session?.status !== "active" || finishing.current) return;
      const userId = session.user?.id ?? clerk.user?.id;
      if (!userId) {
        void navigate({ to: "/auth", replace: true });
        return;
      }
      finishing.current = true;
      try {
        await continueAfterAuth({
          queryClient,
          userId,
          session,
          navigate: ({ to }) => navigate({ to, replace: true }),
          // Session was just activated; still warm the serverFn so _authenticated beforeLoad is fast.
          warmSession: true,
        });
      } catch (err) {
        finishing.current = false;
        toast.error("Account secured, but we couldn't open your workspace", {
          description: err instanceof Error ? err.message : "Please try signing in again.",
        });
        void navigate({ to: "/auth", replace: true });
      }
    };

    void finishIfActive(clerk.session);
    return clerk.addListener(({ session }) => {
      void finishIfActive(session);
    });
  }, [clerk, navigate, queryClient]);

  return (
    <AuthShell showcaseTitle="One extra step keeps your case files and messages safe.">
      <span className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-brass ring-1 ring-brass/15">
        <ShieldCheck className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="text-h3 font-bold">Secure your account</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        LegalFinder requires an authenticator app for two-step verification. Set it up once, save
        your backup codes, then you&apos;ll go straight to your workspace.
      </p>

      <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-border bg-secondary/50 px-3 py-2.5">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-brass">
          <KeyRound className="h-4 w-4" aria-hidden />
        </span>
        <span>
          <span className="block text-sm font-semibold">Authenticator app</span>
          <span className="text-[0.72rem] leading-snug text-muted-foreground">
            Google Authenticator, Authy, 1Password, or similar — SMS is not available.
          </span>
        </span>
      </div>

      <div className="lf-clerk-mfa mt-6">
        {/* redirectUrlComplete is a fallback; the session listener above routes to the role home. */}
        <TaskSetupMFA appearance={legalFinderClerkAppearance} redirectUrlComplete="/auth" />
      </div>
    </AuthShell>
  );
}
