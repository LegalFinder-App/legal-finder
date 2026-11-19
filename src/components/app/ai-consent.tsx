import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Lock, Scale, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiConsent } from "@/lib/ai-consent";
import { CounsellorMark } from "@/components/brand/counsellor-mark";
import { cn } from "@/lib/utils";

/**
 * Shows `children` once this account has agreed to its text being sent to the AI provider;
 * until then, the notice that asks. Consent is stored per Clerk user id in this browser only —
 * one account never sees another's yes, or their chat history.
 */
export function AiConsentGate({
  children,
  onDecline,
  frameClassName,
}: {
  children: ReactNode;
  /** "Not now" — leave the AI feature without agreeing. */
  onDecline: () => void;
  /** Page padding for when the notice stands in for a whole page (the assistant). */
  frameClassName?: string;
}) {
  const consent = useAiConsent();

  if (consent.allowed) return <>{children}</>;
  const frame = (content: ReactNode) =>
    frameClassName ? <div className={frameClassName}>{content}</div> : content;

  if (consent.loading) {
    return frame(
      <div className="mx-auto w-full max-w-lg space-y-3" aria-busy="true" aria-label="Checking AI permission">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-10 w-40" />
      </div>,
    );
  }

  if (!consent.ready) {
    return frame(
      <ConsentShell>
        <div className="flex items-center gap-3">
          <MarkBadge />
          <h2 className="font-display text-lg font-semibold tracking-tight sm:text-xl">
            Sign in to use Counsellor AI
          </h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Your AI chats stay private to your account. We could not confirm who is signed in — please
          refresh, or open your workspace from the header and try again.
        </p>
        <div className="mt-6">
          <Button type="button" variant="outline" onClick={onDecline}>
            Back to workspace
          </Button>
        </div>
      </ConsentShell>,
    );
  }

  return frame(
    <ConsentShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <MarkBadge className="mx-auto sm:mx-0" />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="eyebrow text-brass">Counsellor AI</p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
            Before you continue
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            An advanced model helps with Uganda legal questions and document drafting. It can still
            get details wrong — treat answers as guidance, not a substitute for a verified advocate.
          </p>
        </div>
      </div>

      <ul className="mt-6 space-y-3">
        <ConsentPoint
          icon={<AlertTriangle className="h-4 w-4" />}
          title="May be incomplete or incorrect"
          body="Double-check anything that affects deadlines, arrests, money, or court filings with a licensed advocate."
        />
        <ConsentPoint
          icon={<Lock className="h-4 w-4" />}
          title="What you type is sent to generate a reply"
          body="Questions, drafting instructions, and any images or PDFs you attach go to our AI provider for that answer. Your name and email are not sent with them."
        />
        <ConsentPoint
          icon={<Shield className="h-4 w-4" />}
          title="Chats stay on this device"
          body="History is stored only for your account on this browser. Leave out ID numbers and anything you would not want shared."
        />
        <ConsentPoint
          icon={<Scale className="h-4 w-4" />}
          title="General information, not legal advice"
          body="Counsellor AI explains process and points you to platform resources. It does not create a lawyer–client relationship."
        />
      </ul>

      <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button type="button" variant="brass" className="w-full sm:w-auto" onClick={consent.allow}>
          Allow and continue
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={onDecline}
        >
          Not now
        </Button>
        <Link
          to="/privacy-policy"
          className="mt-1 text-center text-sm text-brass hover:underline sm:mt-0 sm:ml-1 sm:text-left"
        >
          Read the privacy policy
        </Link>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground sm:text-left">
        You can switch this off any time in Settings → Privacy.
      </p>
    </ConsentShell>,
  );
}

function ConsentShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-5 shadow-lg sm:p-7",
          "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-brass/60 before:to-transparent",
          "after:pointer-events-none after:absolute after:-top-24 after:left-1/2 after:h-40 after:w-64 after:-translate-x-1/2 after:rounded-full after:bg-brass/10 after:blur-3xl",
        )}
      >
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

function MarkBadge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-brass/35 bg-gradient-to-br from-brass/25 via-brass/10 to-transparent text-brass shadow-inner",
        className,
      )}
    >
      <CounsellorMark className="h-7 w-7" title="Counsellor AI" />
    </div>
  );
}

function ConsentPoint({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3 rounded-xl border border-border/60 bg-secondary/25 px-3 py-2.5 sm:px-3.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brass/10 text-brass">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
          {body}
        </span>
      </span>
    </li>
  );
}
