import { BookOpen, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** Trust signal on assistant turns — grounded when LegalFinder sources were retrieved. */
export function GroundingPill({
  grounded,
  className,
}: {
  grounded: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "counsellor-cite-pop inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide",
        grounded
          ? "border-brass/35 bg-brass/10 text-brass"
          : "border-border/80 bg-secondary/70 text-muted-foreground",
        className,
      )}
      title={
        grounded
          ? "This reply used retrieved LegalFinder sources"
          : "No matching corpus hits — general guidance only"
      }
    >
      {grounded ? (
        <ShieldCheck className="h-3 w-3" aria-hidden />
      ) : (
        <BookOpen className="h-3 w-3" aria-hidden />
      )}
      {grounded ? "Grounded" : "General guidance"}
    </span>
  );
}
