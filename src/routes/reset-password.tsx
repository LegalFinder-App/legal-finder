import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuth, useSignIn } from "@clerk/tanstack-react-start";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { navigateAfterAuth } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import heroImage from "@/assets/hero-justice.jpg";

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

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  return { score, label: labels[score] };
}

function ResetPassword() {
  const { email: initialEmail } = Route.useSearch();
  const { signIn } = useSignIn();
  const { isLoaded: authLoaded, isSignedIn, userId } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoaded || !isSignedIn || !userId) return;
    navigateAfterAuth(userId).then((home) => navigate({ to: home, replace: true }));
  }, [authLoaded, isSignedIn, userId, navigate]);

  // Two steps: request a code by email, then enter that code alongside the new password.
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);
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
              Almost back in. Choose a strong new password.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-foreground/60">
              Your account, cases and messages will be exactly as you left them.
            </p>
          </div>
          <p className="text-xs text-ink-foreground/40">
            Protected by role-based access control and row-level security.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden">
            <Logo />
          </Link>
          <h1 className="mt-8 font-display text-3xl font-semibold lg:mt-0">
            {step === "request" ? "Reset your password" : "Set a new password"}
          </h1>

          {step === "request" ? (
            <form onSubmit={requestCode} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <Button type="submit" variant="brass" size="lg" className="w-full" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Send reset code
              </Button>
            </form>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoFocus
                  inputMode="numeric"
                  placeholder="123456"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pw">New password</Label>
                <div className="relative">
                  <Input
                    id="pw"
                    type={showPassword ? "text" : "password"}
                    minLength={6}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                {password.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex h-1.5 flex-1 gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-full flex-1 rounded-full",
                            i < strength.score
                              ? strength.score <= 1
                                ? "bg-destructive"
                                : strength.score === 2
                                  ? "bg-warning"
                                  : "bg-success"
                              : "bg-muted",
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{strength.label}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pw2">Confirm password</Label>
                <Input
                  id="pw2"
                  type={showPassword ? "text" : "password"}
                  minLength={6}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  aria-invalid={mismatch}
                />
                {mismatch && <p className="text-xs text-destructive">Passwords don't match</p>}
              </div>

              <Button
                type="submit"
                variant="brass"
                size="lg"
                className="w-full"
                disabled={busy || mismatch || password.length === 0}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Update password
              </Button>
              <button
                type="button"
                onClick={() => setStep("request")}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Didn't get a code? Send again
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
