import { BadgeCheck, Link2, Lock, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { icon: Scale, label: "Grounded corpus" },
  { icon: Link2, label: "Links to originals" },
  { icon: BadgeCheck, label: "Honest authority labels" },
  { icon: Lock, label: "Chat stays on-device" },
] as const;

/** Compact trust rail under the composer — honest, not marketing fluff. */
export function CounsellorTrustStrip({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        "flex flex-wrap items-center justify-center gap-1.5 sm:gap-2",
        className,
      )}
      aria-label="How Counsellor uses sources"
    >
      {ITEMS.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2 py-1 text-[10px] font-medium tracking-wide text-muted-foreground sm:px-2.5 sm:text-[11px]"
        >
          <Icon className="h-3 w-3 shrink-0 text-brass" aria-hidden />
          {label}
        </li>
      ))}
    </ul>
  );
}
