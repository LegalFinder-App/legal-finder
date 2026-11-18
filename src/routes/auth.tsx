import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, useClerk, useSignIn, useSignUp } from "@clerk/tanstack-react-start";
import { toast } from "@/lib/toast";
import {
  ArrowRight,
  Fingerprint,
  Gavel,
  Loader2,
  MailCheck,
  Scale,
  Shield,
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
import { continueAfterAuth, isAlreadySignedInError } from "@/lib/after-auth";
import { cn } from "@/lib/utils";
import { delay } from "@/lib/motion";

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

type Mode = "signin" | "signup";

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
  const { signIn, fetchStatus: signInFetch } = useSignIn();
  const { signUp, fetchStatus: signUpFetch } = useSignUp();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>(initialMode || "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("user");
  const [busy, setBusy] = useState(false);
  const [legalAccepted, setLegalAccepted] = useState(false);
  // Sign-up email verification, or Clerk device-trust / leftover second-factor email OTP.
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [codeReason, setCodeReason] = useState<"signup_email" | "email_code">("signup_email");
  const autoEmailCodeStarted = useRef(false);
  const [shake, setShake] = useState(0);
  const redirectedRef = useRef(false);

  // Clerk JS + sign-in/up resources ready — disable actions until then (no error toast).
  const clerkReady =
    Boolean(authLoaded && clerk.loaded && signIn && signUp) &&
    signInFetch !== "fetching" &&
    signUpFetch !== "fetching";

  /** Poll briefly instead of failing with "still loading" when the user taps early. */
  const waitForClerkReady = async (maxMs = 8_000) => {
    const deadline = Date.now() + maxMs;
    while (Date.now() < deadline) {
      if (
        authLoaded &&
        clerk.loaded &&
        signIn &&
        signUp &&
        signInFetch !== "fetching" &&
        signUpFetch !== "fetching"
      ) {
        return true;
      }
      await sleep(100);
    }
    return false;
  };

  const goToWorkspace = async (resolvedUserId: string) => {
    if (redirectedRef.current) {
      setBusy(false);
      return;
    }
    redirectedRef.current = true;
    setBusy(true);
    try {
      // Soft SPA navigate keeps the in-memory Clerk session so the navbar flips to
      // "Open workspace" and _authenticated can read window.Clerk immediately.
      await continueAfterAuth({
        queryClient,
        userId: resolvedUserId,
        navigate: ({ to }) => navigate({ to, replace: true }),
      });
    } catch {
      redirectedRef.current = false;
      try {
        await navigate({ to: "/dashboard", replace: true });
      } catch {
        toast.error("Signed in, but we couldn't open your workspace", {
          description: "Tap Open workspace in the header, or refresh the page.",
        });
      }
    } finally {
      setBusy(false);
    }
  };

  /** If Clerk says the browser already has a session, open the workspace instead of erroring. */
  const recoverIfAlreadySignedIn = async (err: unknown) => {
    if (!isAlreadySignedInError(err)) return false;
    const sessionId = signIn?.existingSession?.sessionId;
    if (sessionId) {
      try {
        await clerk.setActive({ session: sessionId });
      } catch {
        // fall through — we may still have clerk.user from the active client
      }
    }
    const id = userId ?? clerk.user?.id ?? clerk.session?.user?.id ?? null;
    toast.success("You're already signed in");
    if (id) {
      await goToWorkspace(id);
    } else {
      await navigate({ to: "/dashboard", replace: true });
    }
    return true;
  };

  useEffect(() => {
    if (!authLoaded || !isSignedIn || !userId || redirectedRef.current) return;
    void goToWorkspace(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoaded, isSignedIn, userId]);

  const startEmailCodeStep = async () => {
    const { error } = await signIn.mfa.sendEmailCode();
    if (error) throw error;
    setCodeReason("email_code");
    setVerificationCode("");
  };

  const handleSignInOutcome = async () => {
    if (signIn.status === "complete") {
      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) throw finalizeError;
      toast.success("Signed in");
      const signedInId = clerk.session?.user?.id ?? clerk.user?.id;
      if (signedInId) await goToWorkspace(signedInId);
      return true;
    }
    if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
      // Instance no longer requires authenticator enrollment; email OTP covers device trust and
      // any account that still has a second factor configured.
      await startEmailCodeStep();
      return false;
    }
    throw new Error("Additional verification is required for this account.");
  };

  // Social return / device trust: open email OTP when Clerk left the sign-in mid-factor.
  useEffect(() => {
    if (
      (signIn.status !== "needs_second_factor" && signIn.status !== "needs_client_trust") ||
      autoEmailCodeStarted.current
    ) {
      return;
    }
    autoEmailCodeStarted.current = true;
    setMode("signin");
    startEmailCodeStep().catch((err) =>
      toast.error(err instanceof Error ? err.message : "Couldn't start verification"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signIn.status]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    let redirecting = false;
    try {
      const ready = clerkReady || (await waitForClerkReady());
      if (!ready || !signIn || !signUp) {
        throw new Error("Sign-in took too long to start. Please refresh and try again.");
      }
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
          const createdId = clerk.session?.user?.id ?? clerk.user?.id;
          if (createdId) await goToWorkspace(createdId);
          redirecting = true;
        } else {
          const { error: codeError } = await signUp.verifications.sendEmailCode();
          if (codeError) throw codeError;
          setCodeReason("signup_email");
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
      if (await recoverIfAlreadySignedIn(err)) {
        redirecting = true;
        return;
      }
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setShake((n) => n + 1);
    } finally {
      if (!redirecting) setBusy(false);
    }
  };

  const signInWithPasskey = async () => {
    setBusy(true);
    let redirecting = false;
    try {
      const { error } = await signIn.passkey({ flow: "discoverable" });
      if (error) throw error;
      redirecting = await handleSignInOutcome();
    } catch (err) {
      if (await recoverIfAlreadySignedIn(err)) {
        redirecting = true;
        return;
      }
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
      if (mode === "signup" || codeReason === "signup_email") {
        const { error } = await signUp.verifications.verifyEmailCode({ code });
        if (error) throw error;
        if (signUp.status === "missing_requirements") {
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
        const { error } = await signIn.mfa.verifyEmailCode({ code });
        if (error) throw error;
        if (signIn.status !== "complete") {
          throw new Error("That code didn't work — check it and try again.");
        }
        const { error: finalizeError } = await signIn.finalize();
        if (finalizeError) throw finalizeError;
        toast.success("Signed in");
      }
      // Prefer the just-activated session; fall back to waiting briefly for Clerk to hydrate.
      let signedInId = clerk.session?.user?.id ?? clerk.user?.id ?? null;
      for (let i = 0; !signedInId && i < 20; i++) {
        await new Promise((r) => window.setTimeout(r, 100));
        signedInId = clerk.session?.user?.id ?? clerk.user?.id ?? null;
      }
      if (signedInId) {
        await goToWorkspace(signedInId);
      } else {
        window.setTimeout(() => setBusy(false), 4000);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
      setShake((n) => n + 1);
      setBusy(false);
    }
  };

  // Relative redirect URLs (Clerk docs). Wait for Clerk instead of toasting "still loading".
  const startSocialSignIn = async (
    strategy: "oauth_google" | "oauth_apple" | "oauth_linkedin_oidc",
    label: string,
  ) => {
    if (mode === "signup" && !legalAccepted) {
      toast.error("Please agree to the terms and privacy policy to continue.");
      return;
    }
    setBusy(true);
    try {
      const ready = clerkReady || (await waitForClerkReady());
      if (!ready || !signIn || !signUp) {
        throw new Error("Sign-in took too long to start. Please refresh and try again.");
      }
      const ssoArgs = {
        strategy,
        redirectCallbackUrl: "/sso-callback",
        redirectUrl: "/auth",
      } as const;
      const { error } =
        mode === "signup"
          ? await signUp.sso({ ...ssoArgs, legalAccepted: true })
          : await signIn.sso(ssoArgs);
      if (error) throw error;
      // Browser should navigate to the provider; unlock if we're still here.
      window.setTimeout(() => setBusy(false), 12_000);
    } catch (err) {
      if (await recoverIfAlreadySignedIn(err)) return;
      const message = err instanceof Error ? err.message : `${label} sign-in failed`;
      toast.error(message || `${label} sign-in failed`);
      setBusy(false);
    }
  };

  const google = () => void startSocialSignIn("oauth_google", "Google");
  const apple = () => void startSocialSignIn("oauth_apple", "Apple");
  const linkedin = () => void startSocialSignIn("oauth_linkedin_oidc", "LinkedIn");

  const forgot = () => {
    if (!email) return toast.error("Enter your email first");
    navigate({ to: "/reset-password", search: { email } });
  };

  const onCodeStep = verificationCode !== null;
  const openingWorkspace = Boolean(authLoaded && isSignedIn && userId);
  const title = openingWorkspace
    ? "Opening your workspace"
    : onCodeStep
      ? codeReason === "signup_email"
        ? "Verify your email"
        : "Verify this device"
      : mode === "signin"
        ? "Welcome back"
        : "Create your account";
  const subtitle = openingWorkspace
    ? "You're signed in — taking you to your account now."
    : onCodeStep
      ? codeReason === "signup_email"
        ? `Enter the 6-digit code we sent to ${email}.`
        : "Enter the code we just emailed you to confirm it's really you."
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
        {openingWorkspace ? (
          <div className="mt-8 flex flex-col items-center gap-4 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-brass ring-1 ring-brass/15">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            </span>
            <h1 className="text-h3 font-bold">{title}</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            <Button
              type="button"
              size="lg"
              className="mt-2 h-12 w-full"
              onClick={() => {
                if (!userId) return;
                redirectedRef.current = false;
                void goToWorkspace(userId);
              }}
            >
              Open workspace now
            </Button>
          </div>
        ) : (
          <>
        {onCodeStep && (
          <span className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-brass ring-1 ring-brass/15">
            <MailCheck className="h-6 w-6" aria-hidden />
          </span>
        )}
        <h1 className="text-h3 font-bold">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>

        {onCodeStep ? (
          <form onSubmit={submitVerificationCode} className="animate-rise mt-7 space-y-5">
            <CodeField value={verificationCode} onChange={setVerificationCode} />
            <Button type="submit" size="lg" className="h-12 w-full" loading={busy}>
              Verify and continue
            </Button>
            <button
              type="button"
              onClick={() => setVerificationCode(null)}
              className="min-h-10 w-full rounded-full text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Back
            </button>
          </form>
        ) : (
          <>
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

            <div className="mt-6 grid grid-cols-3 gap-2.5">
              <SocialButton provider="google" onClick={google} disabled={busy || !clerkReady} />
              <SocialButton provider="apple" onClick={apple} disabled={busy || !clerkReady} />
              <SocialButton provider="linkedin" onClick={linkedin} disabled={busy || !clerkReady} />
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
                disabled={!clerkReady || (mode === "signup" && !legalAccepted)}
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
                disabled={busy || !clerkReady}
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
          </>
        )}
      </div>
    </AuthShell>
  );
}
