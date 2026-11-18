import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useClerk, useSignIn, useSignUp } from "@clerk/tanstack-react-start";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";

// OAuth return URL for `signIn.sso({ redirectCallbackUrl })`. Handles transfer to sign-up,
// legal-acceptance gaps, MFA, and second-factor — HandleSSOCallback alone left new Google
// accounts hanging on a black screen when status was `missing_requirements`.
export const Route = createFileRoute("/sso-callback")({
  ssr: false,
  head: () => ({
    meta: [{ title: "LegalFinder | Finishing sign-in" }, { name: "robots", content: "noindex" }],
  }),
  component: SsoCallbackPage,
});

function SsoCallbackPage() {
  const clerk = useClerk();
  const { signIn, fetchStatus: signInFetch } = useSignIn();
  const { signUp, fetchStatus: signUpFetch } = useSignUp();
  const navigate = useNavigate();
  const ran = useRef(false);
  const [message, setMessage] = useState("Finishing sign-in…");

  useEffect(() => {
    if (!clerk.loaded || signInFetch === "fetching" || signUpFetch === "fetching") return;
    if (ran.current) return;
    ran.current = true;

    const goAuth = (mode?: "signup") => {
      void navigate({
        to: "/auth",
        search: mode ? { mode } : undefined,
        replace: true,
      });
    };

    const goMfa = () => {
      void navigate({ to: "/session-tasks/setup-mfa", replace: true });
    };

    const afterActivate = (session?: {
      status?: string;
      currentTask?: { key?: string } | null;
    } | null) => {
      if (session?.status === "pending" && session.currentTask?.key === "setup-mfa") {
        goMfa();
        return;
      }
      goAuth();
    };

    void (async () => {
      try {
        const intent = new URLSearchParams(window.location.search).get("intent");
        const flow = intent === "signIn" || intent === "signUp" ? intent : undefined;
        try {
          await clerk.__internal_resolvePendingProtectCheck?.(flow);
        } catch {
          goAuth(flow === "signUp" ? "signup" : undefined);
          return;
        }

        if (signIn.status === "complete") {
          setMessage("Opening your workspace…");
          await signIn.finalize({
            navigate: async ({ session }) => afterActivate(session),
          });
          return;
        }

        if (signUp.status === "complete") {
          setMessage("Creating your account…");
          await signUp.finalize({
            navigate: async ({ session }) => afterActivate(session),
          });
          return;
        }

        // New social accounts often land here owing legal acceptance (required in production).
        // Auth UI already states that continuing agrees to terms & privacy.
        if (signUp.status === "missing_requirements") {
          setMessage("Almost done…");
          const missing = new Set<string>(signUp.missingFields ?? []);
          const patch: {
            legalAccepted?: boolean;
            firstName?: string;
            lastName?: string;
          } = {};
          if (missing.has("legal_accepted")) patch.legalAccepted = true;
          if (missing.has("first_name") && clerk.user?.firstName) {
            patch.firstName = clerk.user.firstName;
          }
          if (missing.has("last_name") && clerk.user?.lastName) {
            patch.lastName = clerk.user.lastName;
          }
          if (Object.keys(patch).length > 0) {
            const { error } = await signUp.update(patch);
            if (error) throw error;
          }
          // Re-read after update — TS still thinks the old status, so compare via string.
          const nextStatus = String(signUp.status);
          if (nextStatus === "complete") {
            await signUp.finalize({
              navigate: async ({ session }) => afterActivate(session),
            });
            return;
          }
          goAuth("signup");
          return;
        }

        if (signUp.isTransferable) {
          setMessage("Linking your account…");
          const { error } = await signIn.create({ transfer: true });
          if (error) throw error;
          if (String(signIn.status) === "complete") {
            await signIn.finalize({
              navigate: async ({ session }) => afterActivate(session),
            });
            return;
          }
          goAuth();
          return;
        }

        if (signIn.isTransferable) {
          setMessage("Setting up your account…");
          const { error } = await signUp.create({ transfer: true, legalAccepted: true });
          if (error) throw error;
          let next = String(signUp.status);
          if (next === "missing_requirements") {
            const { error: updateError } = await signUp.update({ legalAccepted: true });
            if (updateError) throw updateError;
            next = String(signUp.status);
          }
          if (next === "complete") {
            await signUp.finalize({
              navigate: async ({ session }) => afterActivate(session),
            });
            return;
          }
          goAuth("signup");
          return;
        }

        if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
          goAuth();
          return;
        }

        const sessionId =
          signIn.existingSession?.sessionId ?? signUp.existingSession?.sessionId ?? null;
        if (sessionId) {
          await clerk.setActive({
            session: sessionId,
            navigate: async ({ session }) => afterActivate(session),
          });
          return;
        }

        goAuth();
      } catch (err) {
        console.error("[sso-callback]", err);
        toast.error(err instanceof Error ? err.message : "Couldn't finish social sign-in", {
          description: "Please try again, or sign in with email instead.",
        });
        goAuth();
      }
    })();
  }, [clerk, navigate, signIn, signInFetch, signUp, signUpFetch]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-sky px-6 text-center">
      <div id="clerk-captcha" />
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-brass ring-1 ring-brass/15">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      </span>
      <p className="text-sm font-medium text-foreground">{message}</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        Connecting your account securely. This only takes a moment.
      </p>
    </div>
  );
}
