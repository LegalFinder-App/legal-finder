import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useClerk, useSignIn, useSignUp } from "@clerk/tanstack-react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { continueAfterAuth, hardNavigateTo } from "@/lib/after-auth";
import { toast } from "@/lib/toast";

// OAuth return for `signIn.sso` / `signUp.sso`. Completes legal acceptance + account transfer,
// then hard-navigates to the role home so Safari/Chrome both pick up the session cookie.
export const Route = createFileRoute("/sso-callback")({
  ssr: false,
  head: () => ({
    meta: [{ title: "LegalFinder | Finishing sign-in" }, { name: "robots", content: "noindex" }],
  }),
  component: SsoCallbackPage,
});

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

function SsoCallbackPage() {
  const clerk = useClerk();
  const { signIn, fetchStatus: signInFetch } = useSignIn();
  const { signUp, fetchStatus: signUpFetch } = useSignUp();
  const queryClient = useQueryClient();
  const ran = useRef(false);
  const [message, setMessage] = useState("Finishing sign-in…");

  useEffect(() => {
    if (!clerk.loaded || signInFetch === "fetching" || signUpFetch === "fetching") return;
    if (ran.current) return;
    ran.current = true;

    const goAuth = (mode?: "signup") => {
      hardNavigateTo(mode === "signup" ? "/auth?mode=signup" : "/auth");
    };

    const routeAfterSession = async (session?: {
      user?: { id?: string } | null;
    } | null) => {
      const userId = session?.user?.id ?? clerk.session?.user?.id ?? clerk.user?.id;
      if (!userId) {
        goAuth();
        return;
      }
      try {
        setMessage("Opening your workspace…");
        await continueAfterAuth({
          queryClient,
          userId,
          navigate: ({ to }) => {
            hardNavigateTo(to);
          },
        });
      } catch (err) {
        toast.error("Signed in, but we couldn't open your workspace", {
          description: err instanceof Error ? err.message : "Please try again from the sign-in page.",
        });
        goAuth();
      }
    };

    const statusReady = () => {
      const si = signIn.status;
      const su = signUp.status;
      if (si === "complete" || su === "complete") return true;
      if (su === "missing_requirements") return true;
      if (signIn.isTransferable || signUp.isTransferable) return true;
      if (si === "needs_second_factor" || si === "needs_client_trust") return true;
      if (signIn.existingSession?.sessionId || signUp.existingSession?.sessionId) return true;
      return false;
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

        for (let attempt = 0; attempt < 10 && !statusReady(); attempt++) {
          setMessage("Connecting your account…");
          await sleep(250);
        }

        if (signIn.status === "complete") {
          setMessage("Opening your workspace…");
          await signIn.finalize({
            navigate: async ({ session }) => routeAfterSession(session),
          });
          return;
        }

        if (signUp.status === "complete") {
          setMessage("Creating your account…");
          await signUp.finalize({
            navigate: async ({ session }) => routeAfterSession(session),
          });
          return;
        }

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
          if (String(signUp.status) === "complete") {
            await signUp.finalize({
              navigate: async ({ session }) => routeAfterSession(session),
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
              navigate: async ({ session }) => routeAfterSession(session),
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
              navigate: async ({ session }) => routeAfterSession(session),
            });
            return;
          }
          goAuth("signup");
          return;
        }

        // Device trust / leftover second factor — /auth shows email OTP (no authenticator setup).
        if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
          goAuth();
          return;
        }

        const sessionId =
          signIn.existingSession?.sessionId ?? signUp.existingSession?.sessionId ?? null;
        if (sessionId) {
          await clerk.setActive({
            session: sessionId,
            navigate: async ({ session }) => routeAfterSession(session),
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
  }, [clerk, queryClient, signIn, signInFetch, signUp, signUpFetch]);

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
