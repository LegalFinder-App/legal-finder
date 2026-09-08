import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, useSignIn, useSignUp } from "@clerk/tanstack-react-start";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS, type AppRole } from "@/lib/session";
import { navigateAfterAuth } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import heroImage from "@/assets/hero-justice.jpg";

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
      { title: "Sign in — LegalFinder" },
      {
        name: "description",
        content:
          "Access your LegalFinder workspace as a client, advocate, police officer, judicial officer or administrator.",
      },
      { property: "og:title", content: "Sign in — LegalFinder" },
      { property: "og:description", content: "Access your LegalFinder workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const SIGNUP_ROLES = (Object.keys(ROLE_LABELS) as AppRole[]).filter((role) => role !== "admin");

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth();
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
  // Set once signUp.create() reports the account needs email verification before it can
  // activate — Clerk's default for password sign-up. Switches the form to a code-entry step.
  const [verificationCode, setVerificationCode] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoaded || !isSignedIn || !userId) return;
    navigateAfterAuth(queryClient, userId).then((home) => navigate({ to: home, replace: true }));
  }, [authLoaded, isSignedIn, userId, navigate, queryClient]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await signUp.password({
          emailAddress: email,
          password,
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
                : "Your account is active. Privileged roles require administrator approval.",
          });
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
        if (signIn.status === "complete") {
          const { error: finalizeError } = await signIn.finalize();
          if (finalizeError) throw finalizeError;
          toast.success("Signed in");
        } else if (signIn.status === "needs_client_trust") {
          // Clerk's anti-credential-stuffing check on a browser it hasn't seen before — send a
          // one-time code to confirm it's really this user, same UI as the signup verify step.
          const usesPhone = signIn.supportedSecondFactors?.some((f) => f.strategy === "phone_code");
          const { error: codeError } = usesPhone
            ? await signIn.mfa.sendPhoneCode()
            : await signIn.mfa.sendEmailCode();
          if (codeError) throw codeError;
          setVerificationCode("");
          toast.message("Verify this device", {
            description: usesPhone
              ? "Enter the code we just texted you."
              : "Enter the code we just emailed you.",
          });
        } else {
          throw new Error("Additional verification is required for this account.");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const submitVerificationCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await signUp.verifications.verifyEmailCode({ code: verificationCode });
        if (error) throw error;
        if (signUp.status !== "complete") {
          throw new Error("That code didn't work — check it and try again.");
        }
        const { error: finalizeError } = await signUp.finalize();
        if (finalizeError) throw finalizeError;
        toast.success("Account created", {
          description:
            role === "user"
              ? "Welcome to LegalFinder."
              : "Your account is active. Privileged roles require administrator approval.",
        });
      } else {
        const usesPhone = signIn.supportedSecondFactors?.some((f) => f.strategy === "phone_code");
        const { error } = usesPhone
          ? await signIn.mfa.verifyPhoneCode({ code: verificationCode })
          : await signIn.mfa.verifyEmailCode({ code: verificationCode });
        if (error) throw error;
        if (signIn.status !== "complete") {
          throw new Error("That code didn't work — check it and try again.");
        }
        const { error: finalizeError } = await signIn.finalize();
        if (finalizeError) throw finalizeError;
        toast.success("Signed in");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
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

  const forgot = () => {
    if (!email) return toast.error("Enter your email first");
    navigate({ to: "/reset-password", search: { email } });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden isolate overflow-hidden surface-ink lg:block">
        <img
          src={heroImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" className="text-ink-foreground">
            <Logo />
          </Link>
          <div>
            <p className="eyebrow text-brass">LegalFinder</p>
            <h2 className="mt-4 max-w-md font-display text-4xl font-semibold leading-tight text-ink-foreground">
              The justice system, organised around the person who needs it.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-foreground/60">
              One account works across web, desktop and mobile — with your cases, documents and
              conversations always in sync.
            </p>
          </div>
          <p className="text-xs text-ink-foreground/40">
            Protected by role-based access control and row-level security.
          </p>
        </div>
      </div>

      <div className="surface-ink px-4 py-8 sm:px-8 lg:hidden">
        <Link to="/" className="text-ink-foreground">
          <Logo />
        </Link>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-foreground/70">
          The justice system, organised around the person who needs it — one account across web,
          desktop and mobile.
        </p>
      </div>

      <div className="flex items-center justify-center bg-background px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <h1 className="mt-8 font-display text-3xl font-semibold lg:mt-0">
            {verificationCode !== null
              ? mode === "signin"
                ? "Verify this device"
                : "Verify your email"
              : mode === "signin"
                ? "Welcome back"
                : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {verificationCode !== null
              ? mode === "signin"
                ? "Enter the code we just sent you to confirm it's really you."
                : `Enter the code we sent to ${email}.`
              : mode === "signin"
                ? "Sign in to reach your workspace."
                : "Choose the role that matches how you'll use LegalFinder."}
          </p>

          {verificationCode !== null ? (
            <form onSubmit={submitVerificationCode} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification code</Label>
                <Input
                  id="verification-code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                  autoFocus
                  inputMode="numeric"
                  placeholder="123456"
                />
              </div>
              <Button type="submit" variant="brass" size="lg" className="w-full" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Verify and continue
              </Button>
              <button
                type="button"
                onClick={() => setVerificationCode(null)}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Back
              </button>
            </form>
          ) : (
            <>
              <div className="mt-8 grid grid-cols-2 gap-1 rounded-md bg-secondary p-1">
                {(["signin", "signup"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      "rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                      mode === m
                        ? "bg-card text-foreground shadow-plate"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {m === "signin" ? "Sign in" : "Sign up"}
                  </button>
                ))}
              </div>

              <form onSubmit={submit} className="mt-6 space-y-4">
                {mode === "signup" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full name</Label>
                      <Input
                        id="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        maxLength={100}
                        placeholder="Amina Namusoke"
                      />
                    </div>
                    <div className="space-y-2" role="radiogroup" aria-label="I am signing up as">
                      <Label id="role-label">I am signing up as</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {SIGNUP_ROLES.map((r) => (
                          <button
                            key={r}
                            type="button"
                            role="radio"
                            aria-checked={role === r}
                            aria-pressed={role === r}
                            onClick={() => setRole(r)}
                            className={cn(
                              "rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-colors",
                              role === r
                                ? "border-brass bg-brass/10 text-accent-foreground"
                                : "border-border hover:bg-secondary",
                            )}
                          >
                            {ROLE_LABELS[r]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={255}
                    placeholder="you@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={forgot}
                        className="text-xs text-muted-foreground hover:text-brass"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" variant="brass" size="lg" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or{" "}
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button type="button" variant="outline" size="lg" className="w-full" onClick={google}>
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.3 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
                  />
                </svg>
                Continue with Google
              </Button>
            </>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing you agree to LegalFinder's terms and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}
