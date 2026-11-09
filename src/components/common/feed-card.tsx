import { ArrowUpRight, Flag, Landmark, Shield, TriangleAlert } from "lucide-react";
import { reportConcernHref, SOURCE_META, type LegalFeedItem } from "@/lib/legal-feed/meta";
import { formatDate } from "@/lib/format";
import { trackSpotlight } from "@/lib/motion";
import { cn } from "@/lib/utils";

const SOURCE_STYLE = {
  judiciary: {
    icon: Landmark,
    tile: "bg-[linear-gradient(145deg,oklch(0.86_0.09_82),oklch(0.66_0.12_70))] text-[oklch(0.25_0.05_70)]",
    bar: "from-[oklch(0.82_0.11_80)] via-[oklch(0.7_0.12_70)]",
    spot: "oklch(0.78 0.115 80 / 0.16)",
  },
  upf: {
    icon: Shield,
    tile: "bg-[linear-gradient(145deg,oklch(0.7_0.13_250),oklch(0.45_0.15_262))] text-white",
    bar: "from-[oklch(0.72_0.13_250)] via-[oklch(0.55_0.15_258)]",
    spot: "oklch(0.65 0.14 255 / 0.16)",
  },
  ulii: {
    icon: Landmark,
    tile: "bg-[linear-gradient(145deg,oklch(0.75_0.1_160),oklch(0.5_0.11_165))] text-white",
    bar: "from-[oklch(0.72_0.11_160)] via-[oklch(0.55_0.11_165)]",
    spot: "oklch(0.7 0.11 160 / 0.16)",
  },
} as const;

/**
 * One headline from an official source (Judiciary, Uganda Police): who published it, category,
 * date, the short redacted summary, and links to the original and to report a concern. The whole
 * card opens the original; aggregation only, never the full article (docs/SOURCES.md).
 */
export function FeedCard({ item }: { item: LegalFeedItem }) {
  const meta = SOURCE_META[item.source];
  const style = SOURCE_STYLE[item.source];
  const advisory = item.category === "Public safety" || item.category === "Traffic alert";
  return (
    <article
      onPointerMove={trackSpotlight}
      style={{ "--spot-color": style.spot, "--spot-size": "420px" } as React.CSSProperties}
      className="card-glow spotlight group flex h-full flex-col overflow-hidden p-5 sm:p-6"
    >
      {/* Source-coloured edge that draws itself across on hover. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-gradient-to-r to-transparent transition-transform duration-700 ease-(--ease-out-expo) group-hover:scale-x-100",
          style.bar,
        )}
      />

      <header className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-[inset_0_1px_0_oklch(1_0_0/0.35),0_4px_12px_-4px_oklch(0.2_0.05_262/0.45)]",
            style.tile,
          )}
        >
          <style.icon className="h-[1.1rem] w-[1.1rem]" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-tight">{meta.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            {item.published_at && (
              <time dateTime={item.published_at}>
                {formatDate(item.published_at, { day: "numeric", month: "short", year: "numeric" })}
              </time>
            )}
            {item.published_at && item.category && <span aria-hidden>·</span>}
            {item.category && (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  advisory && "font-semibold text-warning-foreground dark:text-warning",
                )}
              >
                {advisory && <TriangleAlert className="h-3 w-3" aria-hidden />}
                {item.category}
              </span>
            )}
          </span>
        </span>
      </header>

      <h3 className="mt-4 text-[1.0625rem] font-bold leading-snug tracking-[-0.015em] sm:text-lg">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1.5px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-500 ease-(--ease-out-expo) after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] group-hover:bg-[length:100%_1.5px]"
        >
          {item.title}
          <span className="sr-only"> (opens {meta.host} in a new tab)</span>
        </a>
      </h3>

      {item.summary ? (
        <p className="mt-2.5 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
          {item.summary}
        </p>
      ) : item.summary_withheld ? (
        <p className="mt-2.5 rounded-xl border border-dashed border-border bg-secondary/40 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          Summary withheld to protect the people involved — read the official statement.
        </p>
      ) : null}

      <div aria-hidden className="min-h-4 flex-1" />

      {/* Clicks fall through to the card-wide link, except on Report. */}
      <footer className="pointer-events-none relative z-10 mt-5 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
        <span aria-hidden className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold">
          Read on {meta.host}
          <span className="grid h-7 w-7 place-items-center rounded-full bg-secondary text-foreground transition-[transform,background-color,color] duration-500 ease-(--ease-out-expo) group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-primary group-hover:text-primary-foreground">
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        </span>
        <a
          href={reportConcernHref(item)}
          title="Report a concern about this item"
          className="pointer-events-auto inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Flag className="h-3.5 w-3.5" aria-hidden />
          <span className="max-sm:sr-only">Report</span>
          <span className="sr-only"> a concern about this item</span>
        </a>
      </footer>
    </article>
  );
}

export function FeedCardSkeleton() {
  return (
    <div className="card-glow p-5 sm:p-6" aria-hidden>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-40 animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-28 animate-pulse rounded-full bg-muted/70" />
        </div>
      </div>
      <div className="mt-5 h-5 w-4/5 animate-pulse rounded-full bg-muted" />
      <div className="mt-3 h-3.5 w-full animate-pulse rounded-full bg-muted/70" />
      <div className="mt-2 h-3.5 w-2/3 animate-pulse rounded-full bg-muted/70" />
      <div className="mt-8 h-8 w-44 animate-pulse rounded-full bg-muted" />
    </div>
  );
}
