import { cn } from "@/lib/utils";

export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative grid h-9 w-9 place-items-center rounded-md bg-brass/15 ring-1 ring-brass/40">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M12 3v18M5 21h14M4.5 8h15M7.2 8l-3 6a3.2 3.2 0 0 0 6 0l-3-6Zm9.6 0-3 6a3.2 3.2 0 0 0 6 0l-3-6Z"
            stroke="currentColor"
            className="text-brass"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="4.2" r="1.5" className="fill-brass" />
        </svg>
      </span>
      {!compact && (
        <span className="font-display text-[1.15rem] font-semibold leading-none tracking-tight">
          Legal<span className="text-brass">Finder</span>
        </span>
      )}
    </span>
  );
}