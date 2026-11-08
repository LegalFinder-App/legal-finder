import { cn } from "@/lib/utils";

/** The LegalFinder emblem (public/images/brand) beside the wordmark. */
export function Logo({
  className,
  compact = false,
  size = "md",
}: {
  className?: string;
  compact?: boolean;
  size?: "md" | "lg";
}) {
  const px = size === "lg" ? 48 : 36;
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img
        src="/images/brand/emblem-80.webp"
        srcSet="/images/brand/emblem-80.webp 80w, /images/brand/emblem-160.webp 160w"
        sizes={`${px}px`}
        width={px}
        height={px}
        alt=""
        aria-hidden="true"
        decoding="async"
        className="shrink-0 rounded-full shadow-xs ring-1 ring-black/5"
        style={{ width: px, height: px }}
      />
      {compact ? (
        <span className="sr-only">LegalFinder</span>
      ) : (
        <span
          className={cn(
            "font-display font-bold leading-none tracking-[-0.03em]",
            size === "lg" ? "text-[1.4rem]" : "text-[1.15rem]",
          )}
        >
          Legal<span className="text-brass">Finder</span>
        </span>
      )}
    </span>
  );
}
