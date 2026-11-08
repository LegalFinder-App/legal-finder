import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, useClerk, useSignIn, useSignUp } from "@clerk/tanstack-react-start";
import { toast } from "@/lib/toast";
import {
  ArrowRight,
  Fingerprint,
  Gavel,
  KeyRound,
  Loader2,
  MailCheck,
  Scale,
  Shield,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  AuthDivider,
  CodeField,
  EmailField,
  FieldShell,
  IconInput,
  PasswordField,
  SocialButton,
} from "@/components/auth/auth-fields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS, type AppRole } from "@/lib/session";
import { navigateAfterAuth } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { delay } from "@/lib/motion";

type Mode = "signin" | "signup";

type CodeStrategy = "totp" | "phone_code" | "email_code" | "backup_code";

const CODE_STEP_COPY: Record<CodeStrategy, { title: string; description: string }> = {
  totp: {
    title: "Two-step verification",
    description: "Enter the 6-digit code from your authenticator app.",
  },
  phone_code: {
    title: "Two-step verification",
    description: "Enter the code we just texted you.",
  },
  email_code: {
    title: "Verify this device",
    description: "Enter the code we just emailed you to confirm it's really you.",
  },
  backup_code: {
    title: "Use a backup code",
    description: "Enter one of the backup codes you saved when you set up two-step verification.",
  },
};

type AuthSearch = {
  mode?: Mode;
};

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    mode:
      search.mode === "signup"
        ? ("signup" as const)
        : search.mode === "signin"
          ? ("signin" as const)
          : undefined,
  }),
  head: () => ({
    meta: [
      { title: "LegalFinder | Sign in" },
      {
        name: "description",
        content:
          "Access your LegalFinder workspace as a client, advocate, police officer, judicial officer or administrator.",
      },
      { property: "og:title", content: "LegalFinder | Sign in" },
      { property: "og:description", content: "Access your LegalFinder workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const SIGNUP_ROLES = (Object.keys(ROLE_LABELS) as AppRole[]).filter((role) => role !== "admin");

// What each sign-up role is for, shown on the role cards.
const ROLE_DETAILS: Partial<Record<AppRole, { icon: LucideIcon; body: string }>> = {
  user: { icon: UserRound, body: "Get legal help and follow your matters" },
  lawyer: { icon: Scale, body: "Run your practice and take on clients" },
  police: { icon: Shield, body: "Handle incident reports and notices" },
  judiciary: { icon: Gavel, body: "Publish judgements and cause lists" },
};

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth();
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>(initialMode || "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("user");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  // Set once signUp.create() reports the account needs email verification before it can
  // activate — Clerk's default for password sign-up. Switches the form to a code-entry step.
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  // Which Clerk verifier the code step calls for sign-in. MFA-enrolled accounts come back from the
  // first factor as needs_second_factor and mostly use an authenticator app (totp), which the
  // old phone-vs-email guess never handled.
  const [codeStrategy, setCodeStrategy] = useState<CodeStrategy>("email_code");
  const autoSecondFactorStarted = useRef(false);
  // Bumped on a failed attempt; keys the card so it shakes once.
  const [shake, setShake] = useState(0);

  // useAuth() reports a pending session (one still owing Clerk a task, e.g. MFA enrollment) as
  // signed out, so the redirect effect below never fires for it. Clerk's own listener does see
  // pending sessions — without this, a user stuck mid-task lands back on a blank sign-in form.
  useEffect(() => {
    const forwardPendingTask = (session: typeof clerk.session) => {
      if (session?.status === "pending" && session.currentTask?.key === "setup-mfa") {
        navigate({ to: "/session-tasks/setup-mfa", replace: true });
      }
    };
    forwardPendingTask(clerk.session);
    return clerk.addListener(({ session }) => forwardPendingTask(session));
  }, [clerk, navigate]);

  useEffect(() => {
    if (!authLoaded || !isSignedIn || !userId) return;
    navigateAfterAuth(queryClient, userId)
      .then((home) => navigate({ to: home, replace: true }))
      .catch((err) => {
        toast.error("Signed in, but we couldn't load your workspace", {
          description: err instanceof Error ? err.message : "Please try refreshing the page.",
        });
      })
      // Whether this lands on a redirect (component unmounts, so this is a no-op) or an error
      // (user stays on this page), busy must clear either way -- see the note in submit() about
      // why it isn't cleared any earlier.
      .finally(() => setBusy(false));
  }, [authLoaded, isSignedIn, userId, navigate, queryClient]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    // Reaching Clerk's "complete" status below hands off to the isSignedIn effect above, which
    // still has its own Supabase round trip (role lookup) before the redirect actually happens.
    // Clearing busy here rather than leaving it to that effect made the button/spinner stop
    // *before* anything visible had happened yet, reading as a stall -- so on that path we
    // deliberately leave busy on and let the effect's own finally() above clear it once the
    // redirect (or a failure) actually occurs.
    let redirecting = false;
    try {
      if (mode === "signup") {
        if (!legalAccepted) {
          toast.error("Please agree to the terms and privacy policy to continue.");
          return;
        }
        const { error } = await signUp.password({
          emailAddress: email,
          password,
          legalAccepted,
          unsafeMetadata: { full_name: fullName, requested_role: role },
        });
        if (error) throw error;
        if (signUp.status === "complete") {
          const { error: finalizeError } = await signUp.finalize();
          if (finalizeError) throw finalizeError;
          toast.success("Account created", {
            description:
              role === "user"
                ? "Welcome to LegalFinder."
                : "Next, send your details and documents for review.",
          });
          redirecting = true;
        } else {
          const { error: codeError } = await signUp.verifications.sendEmailCode();
          if (codeError) throw codeError;
          setVerificationCode("");
          toast.message("Check your email", {
            description: "Enter the verification code we just sent you.",
          });
        }
      } else {
        const { error } = await signIn.password({ identifier: email, password });
        if (error) throw error;
        redirecting = await handleSignInOutcome();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setShake((n) => n + 1);
    } finally {
      if (!redirecting) setBusy(false);
    }
  };

  const availableFactors = (signIn.supportedSecondFactors ?? []).map((f) => f.strategy) as string[];

  // Switches the form to the code step using the first strategy in `preference` this account
  // actually supports, sending the SMS/email first when that strategy needs one.
  const startCodeStep = async (preference: CodeStrategy[]) => {
    const strategy = preference.find((s) => availableFactors.includes(s)) ?? preference[0];
    if (strategy === "phone_code") {
      const { error } = await signIn.mfa.sendPhoneCode();
      if (error) throw error;
    } else if (strategy === "email_code") {
      const { error } = await signIn.mfa.sendEmailCode();
      if (error) throw error;
    }
    setCodeStrategy(strategy);
    setVerificationCode("");
  };

  // Shared by password, passkey and (via the effect below) OAuth sign-in — every path lands here
  // once Clerk has verified the first factor. Returns true when this reached "complete" and
  // handed off to the isSignedIn redirect effect, false when it switched to a code-entry step
  // instead (caller should re-enable its form).
  const handleSignInOutcome = async () => {
    if (signIn.status === "complete") {
      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) throw finalizeError;
      toast.success("Signed in");
      return true;
    } else if (signIn.status === "needs_second_factor") {
      await startCodeStep(["totp", "phone_code", "backup_code"]);
      return false;
    } else if (signIn.status === "needs_client_trust") {
      // Clerk's anti-credential-stuffing check on a browser it hasn't seen before — confirm it's
      // really this user with a one-time code before the session activates.
      await startCodeStep(["phone_code", "email_code"]);
      return false;
    } else {
      throw new Error("Additional verification is required for this account.");
    }
  };

  // OAuth (Google/Apple/LinkedIn) for an MFA-enrolled account returns here from /sso-callback
  // with the sign-in still waiting on its second factor — nothing submitted on this page, so
  // nothing else would ever open the code step.
  useEffect(() => {
    if (signIn.status !== "needs_second_factor" || autoSecondFactorStarted.current) return;
    autoSecondFactorStarted.current = true;
    setMode("signin");
    startCodeStep(["totp", "phone_code", "backup_code"]).catch((err) =>
      toast.error(err instanceof Error ? err.message : "Couldn't start verification"),
    );
    // startCodeStep is recreated each render; keying on the status is what matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signIn.status]);

  const signInWithPasskey = async () => {
    setBusy(true);
    let redirecting = false;
    try {
      const { error } = await signIn.passkey({ flow: "discoverable" });
      if (error) throw error;
      redirecting = await handleSignInOutcome();
    } catch (err) {
      // The user cancelling the OS's passkey picker is normal, not an error worth alarming them with.
      const message = err instanceof Error ? err.message : "";
      if (!/not allowed|cancel/i.test(message)) {
        toast.error(message || "Passkey sign-in failed");
      }
    } finally {
      if (!redirecting) setBusy(false);
    }
  };

  const submitVerificationCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = verificationCode?.trim();
    if (!code) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await signUp.verifications.verifyEmailCode({ code });
        if (error) throw error;
        if (signUp.status === "missing_requirements") {
          // The code itself was correct — Clerk marked the email verified — but something else
          // the sign-up now requires wasn't supplied, so it can't finalize into an account.
          throw new Error(
            `Your email is verified, but sign-up needs: ${signUp.missingFields.join(", ")}. Contact support@legalfinder.co — your email may already show as verified on a retry.`,
          );
        }
        if (signUp.status !== "complete") {
          throw new Error("That code didn't work — check it and try again.");
        }
        const { error: finalizeError } = await signUp.finalize();
        if (finalizeError) throw finalizeError;
        toast.success("Account created", {
          description:
            role === "user"
              ? "Welcome to LegalFinder."
              : "Next, send your details and documents for review.",
        });
      } else {
        const { error } =
          codeStrategy === "totp"
            ? await signIn.mfa.verifyTOTP({ code })
            : codeStrategy === "backup_code"
              ? await signIn.mfa.verifyBackupCode({ code })
              : codeStrategy === "phone_code"
                ? await signIn.mfa.verifyPhoneCode({ code })
                : await signIn.mfa.verifyEmailCode({ code });
        if (error) throw error;
        if (signIn.status !== "complete") {
          throw new Error("That code didn't work — check it and try again.");
        }
        const { error: finalizeError } = await signIn.finalize();
        if (finalizeError) throw finalizeError;
        toast.success("Signed in");
      }
      // Both branches above only reach here via finalize() succeeding, which hands off to the
      // isSignedIn redirect effect -- so busy stays on and that effect's finally() clears it,
      // same reasoning as submit().
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
      setShake((n) => n + 1);
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const { error } = await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectCallbackUrl: `${window.location.origin}/auth`,
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setBusy(false);
    }
  };

  const apple = async () => {
    setBusy(true);
    try {
      const { error } = await signIn.sso({
        strategy: "oauth_apple",
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectCallbackUrl: `${window.location.origin}/auth`,
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Apple sign-in failed");
      setBusy(false);
    }
  };

  const linkedin = async () => {
    setBusy(true);
    try {
      const { error } = await signIn.sso({
        strategy: "oauth_linkedin_oidc",
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectCallbackUrl: `${window.location.origin}/auth`,
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "LinkedIn sign-in failed");
      setBusy(false);
    }
  };

  const forgot = () => {
    if (!email) return toast.error("Enter your email first");
    navigate({ to: "/reset-password", search: { email } });
  };

  const onCodeStep = verificationCode !== null;
  const title = onCodeStep
    ? mode === "signin"
      ? CODE_STEP_COPY[codeStrategy].title
      : "Verify your email"
    : mode === "signin"
      ? "Welcome back"
      : "Create your account";
  const subtitle = onCodeStep
    ? mode === "signin"
      ? CODE_STEP_COPY[codeStrategy].description
      : `Enter the 6-digit code we sent to ${email}.`
    : mode === "signin"
      ? "Sign in to reach your workspace."
      : "Free for clients. Professionals are verified before going live.";

  return (
    <AuthShell
      showcaseTitle={
        mode === "signup"
          ? "Join the platform built around the person who needs justice."
          : "The justice system, organised around the person who needs it."
      }
    >
      <div key={shake} className={cn(shake > 0 && "animate-shake")}>
        {onCodeStep && (
          <span className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-brass ring-1 ring-brass/15">
            {mode === "signup" || codeStrategy === "email_code" ? (
              <MailCheck className="h-6 w-6" aria-hidden />
            ) : codeStrategy === "backup_code" ? (
              <KeyRound className="h-6 w-6" aria-hidden />
            ) : (
              <ShieldCheck className="h-6 w-6" aria-hidden />
            )}
          </span>
        )}
        <h1 className="text-h3 font-bold">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>

        {onCodeStep ? (
          <form onSubmit={submitVerificationCode} className="animate-rise mt-7 space-y-5">
            <CodeField
              value={verificationCode}
              onChange={setVerificationCode}
              backup={mode === "signin" && codeStrategy === "backup_code"}
            />
            <Button type="submit" size="lg" className="h-12 w-full" loading={busy}>
              Verify and continue
            </Button>
            <div className="space-y-1 text-center">
              {mode === "signin" &&
                (["totp", "phone_code", "backup_code"] as CodeStrategy[])
                  .filter((s) => s !== codeStrategy && availableFactors.includes(s))
                  .map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        startCodeStep([s]).catch((err) =>
                          toast.error(
                            err instanceof Error ? err.message : "Couldn't switch method",
                          ),
                        )
                      }
                      className="block min-h-10 w-full rounded-full text-sm font-semibold text-brass hover:bg-accent"
                    >
                      {s === "totp"
                        ? "Use your authenticator app instead"
                        : s === "phone_code"
                          ? "Text me a code instead"
                          : "Use a backup code instead"}
                    </button>
                  ))}
              <button
                type="button"
                onClick={() => setVerificationCode(null)}
                className="min-h-10 w-full rounded-full text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                Back
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Sign in / Sign up */}
            <div
              role="tablist"
              aria-label="Choose sign in or sign up"
              className="relative mt-7 grid grid-cols-2 rounded-full border border-border bg-secondary/70 p-1"
            >
              <span
                aria-hidden
                className={cn(
                  "absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-full bg-card shadow-plate transition-transform duration-300 ease-(--ease-out-expo) dark:bg-white/12 dark:ring-1 dark:ring-white/15",
                  mode === "signup" && "translate-x-full",
                )}
              />
              {(["signin", "signup"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "relative z-10 min-h-10 rounded-full text-sm font-semibold transition-colors duration-200",
                    mode === m ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "signin" ? "Sign in" : "Sign up"}
                </button>
              ))}
            </div>

            {/* Social first: fastest path for most people */}
            <div className="mt-6 grid grid-cols-3 gap-2.5">
              <SocialButton provider="google" onClick={google} disabled={busy} />
              <SocialButton provider="apple" onClick={apple} disabled={busy} />
              <SocialButton provider="linkedin" onClick={linkedin} disabled={busy} />
            </div>

            <AuthDivider>or continue with email</AuthDivider>

            <form key={mode} onSubmit={submit} className="space-y-4" noValidate={false}>
              {mode === "signup" && (
                <>
                  <div className="animate-rise" style={delay(0)}>
                    <FieldShell id="name" label="Full name">
                      <IconInput
                        icon={UserRound}
                        id="name"
                        name="name"
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        maxLength={100}
                        placeholder="Amina Namusoke"
                      />
                    </FieldShell>
                  </div>
                  <fieldset className="animate-rise space-y-2" style={delay(50)}>
                    <legend className="text-sm font-semibold">I am signing up as</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {SIGNUP_ROLES.map((r) => {
                        const detail = ROLE_DETAILS[r];
                        const Icon = detail?.icon ?? UserRound;
                        return (
                          <label
                            key={r}
                            className={cn(
                              "relative flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-3 transition-[border-color,background-color,box-shadow] duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
                              role === r
                                ? "border-brass bg-accent shadow-xs"
                                : "border-border hover:border-foreground/20 hover:bg-secondary/60",
                            )}
                          >
                            <input
                              type="radio"
                              name="role"
                              value={r}
                              checked={role === r}
                              onChange={() => setRole(r)}
                              className="sr-only"
                            />
                            <span className="flex items-center justify-between">
                              <span
                                className={cn(
                                  "grid h-8 w-8 place-items-center rounded-lg",
                                  role === r
                                    ? "bg-brass text-brass-foreground"
                                    : "bg-secondary text-muted-foreground",
                                )}
                              >
                                <Icon className="h-4 w-4" aria-hidden />
                              </span>
                              <span
                                aria-hidden
                                className={cn(
                                  "h-4 w-4 rounded-full border-2 transition-colors",
                                  role === r
                                    ? "border-brass bg-brass shadow-[inset_0_0_0_2px_var(--card)]"
                                    : "border-border",
                                )}
                              />
                            </span>
                            <span className="text-sm font-semibold leading-tight">
                              {ROLE_LABELS[r]}
                            </span>
                            {detail && (
                              <span className="text-[0.72rem] leading-snug text-muted-foreground">
                                {detail.body}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                    {role !== "user" ? (
                      <p className="rounded-xl bg-secondary/70 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                        Next you’ll send your details and documents (such as your ID and{" "}
                        {role === "lawyer" ? "practising certificate" : "staff identity card"}). An
                        administrator checks them before your {ROLE_LABELS[role].toLowerCase()}{" "}
                        account is switched on.
                      </p>
                    ) : null}
                  </fieldset>
                </>
              )}

              <div className="animate-rise" style={delay(mode === "signup" ? 100 : 0)}>
                <EmailField id="email" value={email} onChange={setEmail} />
              </div>

              <div className="animate-rise" style={delay(mode === "signup" ? 150 : 60)}>
                <PasswordField
                  id="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  showStrength={mode === "signup"}
                  aside={
                    mode === "signin" ? (
                      <button
                        type="button"
                        onClick={forgot}
                        className="rounded-full px-1 text-xs font-semibold text-brass hover:underline"
                      >
                        Forgot password?
                      </button>
                    ) : undefined
                  }
                />
              </div>

              {mode === "signup" && (
                <div className="animate-rise flex items-start gap-2.5" style={delay(200)}>
                  <Checkbox
                    id="legal-accepted"
                    checked={legalAccepted}
                    onCheckedChange={(checked) => setLegalAccepted(checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="legal-accepted" className="text-xs font-normal leading-relaxed">
                    I agree to LegalFinder's{" "}
                    <Link
                      to="/terms-of-service"
                      className="text-brass underline decoration-brass/40 underline-offset-2 hover:decoration-brass"
                      target="_blank"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/privacy-policy"
                      className="text-brass underline decoration-brass/40 underline-offset-2 hover:decoration-brass"
                      target="_blank"
                    >
                      Privacy Policy
                    </Link>
                    . There is no tolerance for objectionable content or abusive users.
                  </Label>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="shine h-12 w-full"
                loading={busy}
                disabled={mode === "signup" && !legalAccepted}
              >
                {mode === "signin" ? "Sign in" : "Create account"}
                {!busy && <ArrowRight aria-hidden />}
              </Button>
            </form>

            {mode === "signin" && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="mt-3 h-12 w-full"
                disabled={busy}
                onClick={() => void signInWithPasskey()}
              >
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Fingerprint />}
                Sign in with a passkey
              </Button>
            )}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "New to LegalFinder? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="font-semibold text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing you agree to LegalFinder's{" "}
          <Link
            to="/terms-of-service"
            className="text-brass underline decoration-brass/40 underline-offset-2 hover:decoration-brass"
          >
            terms
          </Link>{" "}
          and{" "}
          <Link
            to="/privacy-policy"
            className="text-brass underline decoration-brass/40 underline-offset-2 hover:decoration-brass"
          >
            privacy policy
          </Link>
          .
        </p>
      </div>
    </AuthShell>
  );
}
