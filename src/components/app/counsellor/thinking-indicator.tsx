import { Loader2 } from "lucide-react";

/** Honest status labels only — driven by the streaming API's real status events. */
export function ThinkingIndicator({ label = "Understanding your question" }: { label?: string }) {
  return (
    <div
      className="counsellor-msg-in mr-auto flex max-w-xl items-center gap-3 rounded-2xl border border-border/80 bg-card/80 px-4 py-3 text-sm text-muted-foreground shadow-sm backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brass/15">
        <Loader2 className="h-4 w-4 animate-spin text-brass" aria-hidden />
      </span>
      <div>
        <p className="font-medium text-foreground/90">{label}…</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Counsellor AI is drafting a reply</p>
      </div>
    </div>
  );
}
