import { Loader2 } from "lucide-react";

/** Honest status labels only — driven by the streaming API's real status events. */
export function ThinkingIndicator({ label = "Understanding your question" }: { label?: string }) {
  return (
    <div
      className="counsellor-msg-in mr-auto flex max-w-xl flex-col gap-2.5 rounded-2xl border border-border/80 bg-card/80 px-4 py-3 text-sm text-muted-foreground shadow-sm backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brass/15">
          <span
            aria-hidden
            className="counsellor-status-pulse absolute inset-0 rounded-full bg-brass/20"
          />
          <Loader2 className="relative h-4 w-4 animate-spin text-brass" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-foreground/90">{label}…</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Counsellor AI is drafting a reply</p>
        </div>
      </div>
      <div
        aria-hidden
        className="h-1 overflow-hidden rounded-full bg-secondary/80"
      >
        <div className="counsellor-status-bar h-full w-1/3 rounded-full bg-gradient-to-r from-brass/40 via-brass to-brass/40" />
      </div>
    </div>
  );
}
