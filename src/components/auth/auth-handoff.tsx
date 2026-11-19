import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Link } from "@tanstack/react-router";

/**
 * Full-viewport “finishing sign-in” screen used by /sso-callback and by /auth when a session
 * already exists (so the sign-in form never flashes after Google/Apple/LinkedIn).
 */
export function AuthHandoff({
  title = "Opening your workspace",
  detail = "You’re signed in. Taking you to your account now.",
  action,
}: {
  title?: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-sky pb-safe pt-safe">
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light" />
      <div
        aria-hidden
        className="animate-aurora absolute -left-32 -top-32 -z-10 h-[22rem] w-[22rem] rounded-full bg-gold/20 blur-[100px]"
      />
      <div
        aria-hidden
        className="animate-aurora absolute -bottom-40 -right-24 -z-10 h-[24rem] w-[24rem] rounded-full bg-info/15 blur-[110px] [animation-delay:-8s]"
      />

      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Link to="/" aria-label="LegalFinder home" className="rounded-full text-foreground">
          <Logo />
        </Link>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
        <div className="animate-auth-in w-full max-w-sm rounded-[1.75rem] border border-border bg-card p-8 shadow-float sm:p-10">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-brass ring-1 ring-brass/15">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          </span>
          <h1 className="mt-5 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{detail}</p>
          {action ? <div className="mt-6">{action}</div> : null}
          <p className="mt-6 text-xs text-muted-foreground">
            Connecting your account securely. This only takes a moment.
          </p>
        </div>
      </div>
    </div>
  );
}
