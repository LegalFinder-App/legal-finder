import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useClerk, useSignIn, useSignUp } from "@clerk/tanstack-react-start";
import { useQueryClient } from "@tanstack/react-query";
import { AuthHandoff } from "@/components/auth/auth-handoff";
import { clearAuthHandoff, markAuthHandoff } from "@/lib/auth-handoff";
import { finishAuthWithHardNav, hardNavigateTo } from "@/lib/after-auth";
import { toast } from "@/lib/toast";

// OAuth return. Completes transfer / finalize, waits for the Clerk cookie, then hard-navigates
// once to the workspace. Ambiguous failures go to /dashboard (with handoff), never the sign-in
// form — only device-trust / email OTP may open /auth.
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
  const [title, setTitle] = useState("Finishing sign-in");
  const [detail, setDetail] = useState("Confirming your account with the identity provider.");

  useEffect(() => {
    markAuthHandoff();
  }, []);

  useEffect(() => {
    if (!clerk.loaded || signInFetch === "fetching" || signUpFetch === "fetching") return;
    if (ran.current) return;
    ran.current = true;

    const waitForUserId = async (maxMs = 6_000) => {
      const deadline = Date.now() + maxMs;
      while (Date.now() < deadline) {
        const id = clerk.session?.user?.id ?? clerk.user?.id ?? null;
        if (id) return id;
        await sleep(80);
      }
      return clerk.session?.user?.id ?? clerk.user?.id ?? null;
    };

    const openWorkspace = async (userId: string) => {
      setTitle("Opening your workspace");
      setDetail("You’re signed in. Taking you to your account now.");
      markAuthHandoff();
      try {
        await finishAuthWithHardNav({ queryClient, userId });
      } catch (err) {
        console.error("[sso-callback] workspace", err);
        // Never park on /opening — go straight into the app shell.
        markAuthHandoff();
        window.location.replace("/dashboard");
      }
    };

    /** Prefer workspace over /auth whenever a session might exist. */
    const preferWorkspace = async () => {
      const id = await waitForUserId(4_000);
      if (id) {
        await openWorkspace(id);
        return true;
      }
      markAuthHandoff();
      window.location.replace("/dashboard");
      return true;
    };

    /** Device trust / email OTP only — the form on /auth is required. */
    const goAuthForOtp = () => {
      clearAuthHandoff();
      hardNavigateTo("/auth");
    };

    const routeAfterSession = async (session?: { user?: { id?: string } | null } | null) => {
      let userId = session?.user?.id ?? clerk.session?.user?.id ?? clerk.user?.id ?? null;
      if (!userId) userId = await waitForUserId(5_000);
      if (!userId) {
        await preferWorkspace();
        return;
      }
      await openWorkspace(userId);
    };

    const statusReady = () => {
      const si = signIn.status;
      const su = signUp.status;
      if (si === "complete" || su === "complete") return true;
      if (su === "missing_requirements") return true;
      if (signIn.isTransferable || signUp.isTransferable) return true;
      if (si === "needs_second_factor" || si === "needs_client_trust") return true;
      if (signIn.existingSession?.sessionId || signUp.existingSession?.sessionId) return true;
      if (clerk.session?.status === "active" && (clerk.user?.id || clerk.session.user?.id)) {
        return true;
      }
      return false;
    };

    void (async () => {
      try {
        const intent = new URLSearchParams(window.location.search).get("intent");
        const flow = intent === "signIn" || intent === "signUp" ? intent : undefined;
        try {
          await clerk.__internal_resolvePendingProtectCheck?.(flow);
        } catch {
          await preferWorkspace();
          return;
        }

        for (let attempt = 0; attempt < 24 && !statusReady(); attempt++) {
          setTitle("Connecting your account");
          setDetail("Confirming your account with the identity provider.");
          await sleep(200);
        }

        if (clerk.session?.status === "active" && (clerk.user?.id || clerk.session.user?.id)) {
          await routeAfterSession(clerk.session);
          return;
        }

        if (signIn.status === "complete") {
          await signIn.finalize({
            navigate: async ({ session }) => routeAfterSession(session),
          });
          return;
        }

        if (signUp.status === "complete") {
          setTitle("Creating your account");
          setDetail("Setting up your LegalFinder profile.");
          await signUp.finalize({
            navigate: async ({ session }) => routeAfterSession(session),
          });
          return;
        }

        if (signUp.status === "missing_requirements") {
          setTitle("Almost done");
          setDetail("Confirming the last details for your account.");
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
          // Still missing fields we can't fill (e.g. custom) — try workspace / dashboard first.
          await preferWorkspace();
          return;
        }

        if (signUp.isTransferable) {
          setTitle("Linking your account");
          setDetail("Connecting this sign-in method to your existing LegalFinder account.");
          const { error } = await signIn.create({ transfer: true });
          if (error) throw error;
          if (String(signIn.status) === "complete") {
            await signIn.finalize({
              navigate: async ({ session }) => routeAfterSession(session),
            });
            return;
          }
          await preferWorkspace();
          return;
        }

        if (signIn.isTransferable) {
          setTitle("Setting up your account");
          setDetail("Creating your LegalFinder profile from this sign-in.");
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
          await preferWorkspace();
          return;
        }

        if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
          goAuthForOtp();
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

        await preferWorkspace();
      } catch (err) {
        console.error("[sso-callback]", err);
        if (await waitForUserId(3_000)) {
          await routeAfterSession(clerk.session);
          return;
        }
        toast.error(err instanceof Error ? err.message : "Couldn't finish social sign-in", {
          description: "Please try again, or sign in with email instead.",
        });
        markAuthHandoff();
        window.location.replace("/dashboard");
      }
    })();
  }, [clerk, queryClient, signIn, signInFetch, signUp, signUpFetch]);

  return <AuthHandoff title={title} detail={detail} />;
}
