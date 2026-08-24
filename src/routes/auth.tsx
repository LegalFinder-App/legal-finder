import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_HOME, ROLE_LABELS, primaryRoleFrom, type AppRole } from "@/lib/session";
import { navigateAfterAuth } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import heroImage from "@/assets/hero-justice.jpg";

type Mode = "signin" | "signup";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "signup" ? ("signup" as const) : ("signin" as const),
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

const SIGNUP_ROLES: AppRole[] = ["user", "lawyer", "police", "judiciary"];

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AppRole>("user");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id);
      const list = (roles ?? []).map((r) => r.role as AppRole);
      navigate({ to: ROLE_HOME[primaryRoleFrom(list)], replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName, requested_role: role },
          },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            full_name: fullName,
            email,
            requested_role: role,
          });
        }
        toast.success("Account created", {
          description:
            role === "user"
              ? "Welcome to LegalFinder."
              : "Your account is active. Privileged roles require administrator approval.",
        });
        navigate({ to: ROLE_HOME.user, replace: true });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          navigate({ to: await navigateAfterAuth(data.user.id), replace: true });
        }
        toast.success("Signed in");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email) return toast.error("Enter your email first");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Reset link sent", { description: "Check your inbox." });
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

      <div className="flex items-center justify-center bg-background px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden">
            <Logo />
          </Link>
          <h1 className="mt-8 font-display text-3xl font-semibold lg:mt-0">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to reach your workspace."
              : "Choose the role that matches how you'll use LegalFinder."}
          </p>

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
                <div className="space-y-2">
                  <Label>I am signing up as</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SIGNUP_ROLES.map((r) => (
                      <button
                        key={r}
                        type="button"
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
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" variant="brass" size="lg" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
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

          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing you agree to LegalFinder's terms and privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}
