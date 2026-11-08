import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiConsent } from "@/lib/ai-consent";

/**
 * Shows `children` once this account has agreed to its text being sent to the AI provider;
 * until then, the notice that asks. One yes covers both AI features (the notice names both), so
 * neither asks again after the other. See lib/ai-consent for why this exists.
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
  if (consent.loading) return frame(<Skeleton className="h-40 w-full" />);

  return frame(
    <div className="card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 shrink-0 text-brass" />
        <h2 className="font-display text-lg font-semibold">Before you use AI features</h2>
      </div>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-foreground/90">
        <p>
          The legal assistant and AI-assisted document drafting are powered by Claude, an AI model
          made by Anthropic. What you type into them — your questions, your drafting instructions
          and the draft you are revising — is sent to Anthropic to write the response.
        </p>
        <p>
          Your name, email and account details are not sent with it, and LegalFinder does not keep
          your conversation with the assistant. Leave out names, ID numbers and anything else you
          would not want shared.
        </p>
        <p className="text-muted-foreground">
          Answers and drafts are general information, not legal advice. For anything that matters,
          ask a verified advocate.
        </p>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button type="button" variant="brass" onClick={consent.allow}>
          Allow and continue
        </Button>
        <Button type="button" variant="outline" onClick={onDecline}>
          Not now
        </Button>
        <Link to="/privacy-policy" className="ml-1 text-sm text-brass hover:underline">
          Read the privacy policy
        </Link>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        You can switch this off at any time in Settings.
      </p>
    </div>,
  );
}
