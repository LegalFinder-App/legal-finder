import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, useSignIn } from "@clerk/tanstack-react-start";
import { toast } from "@/lib/toast";
import { ArrowLeft, KeyRound, MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { CodeField, EmailField, PasswordField } from "@/components/auth/auth-fields";
import { Button } from "@/components/ui/button";
import { navigateAfterAuth } from "@/lib/rbac";

type ResetPasswordSearch = { email?: string };

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reset password — LegalFinder" },
      { name: "description", content: "Choose a new password for your LegalFinder account." },
      { property: "og:title", content: "Reset password — LegalFinder" },
      { property: "og:description", content: "Choose a new password for your account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const { email: initialEmail } = Route.useSearch();
  const { signIn } = useSignIn();
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoaded || !isSignedIn || !userId) return;
    navigateAfterAuth(queryClient, userId).then((home) => navigate({ to: home, replace: true }));
  }, [authLoaded, isSignedIn, userId, navigate, queryClient]);

  // Two steps: request a code by email, then enter that code alongside the new password.
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error: identifierError } = await signIn.create({ identifier: email });
      if (identifierError) throw identifierError;
      const { error: codeError } = await signIn.resetPasswordEmailCode.sendCode();
      if (codeError) throw codeError;
      setStep("reset");
      toast.message("Check your email", { description: "Enter the code we just sent you." });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send a reset code");
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code });
      if (verifyError) throw verifyError;
      const { error: submitError } = await signIn.resetPasswordEmailCode.submitPassword({
        password,
      });
      if (submitError) throw submitError;
      if (signIn.status !== "complete") {
        throw new Error("Couldn't complete the reset — check the code and try again.");
      }
      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) throw finalizeError;
      toast.success("Password updated");
      // Navigation happens via the useAuth()-driven effect above once isSignedIn flips true.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't reset your password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell showcaseTitle="Almost back in. Your cases and messages are exactly as you left them.">
      <span className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-brass ring-1 ring-brass/15">
        {step === "request" ? (
          <KeyRound className="h-6 w-6" aria-hidden />
        ) : (
          <MailCheck className="h-6 w-6" aria-hidden />
        )}
      </span>
      <h1 className="text-h3 font-bold">
        {step === "request" ? "Reset your password" : "Set a new password"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {step === "request"
          ? "Enter your account email and we'll send you a 6-digit reset code."
          : `Enter the code we sent to ${email} and choose a new password.`}
      </p>

      {step === "request" ? (
        <form key="request" onSubmit={requestCode} className="animate-rise mt-7 space-y-5">
          <EmailField id="email" value={email} onChange={setEmail} autoFocus={!email} />
          <Button type="submit" size="lg" className="shine h-12 w-full" loading={busy}>
            Send reset code
          </Button>
        </form>
      ) : (
        <form key="reset" onSubmit={submit} className="animate-rise mt-7 space-y-5">
          <CodeField id="code" value={code} onChange={setCode} />
          <PasswordField
            id="pw"
            label="New password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            showStrength
          />
          <PasswordField
            id="pw2"
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            invalidMessage={mismatch ? "Passwords don't match" : null}
          />
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full"
            loading={busy}
            disabled={mismatch || password.length === 0}
          >
            Update password
          </Button>
          <button
            type="button"
            onClick={() => setStep("request")}
            className="min-h-10 w-full rounded-full text-sm font-semibold text-brass hover:bg-accent"
          >
            Didn't get a code? Send again
          </button>
        </form>
      )}

      <Link
        to="/auth"
        className="mt-6 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to sign in
      </Link>
    </AuthShell>
  );
}
