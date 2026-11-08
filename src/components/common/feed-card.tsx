import { ArrowUpRight, CalendarDays, Flag, Landmark, Shield } from "lucide-react";
import { reportConcernHref, SOURCE_META, type LegalFeedItem } from "@/lib/legal-feed/meta";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * One headline from an official source (Judiciary, Uganda Police): source and category, date,
 * the short redacted summary, and links to the original and to report a concern. The whole card
 * opens the original; aggregation only, never the full article (docs/SOURCES.md).
 */
export function FeedCard({ item }: { item: LegalFeedItem }) {
  const meta = SOURCE_META[item.source];
  const SourceIcon = item.source === "judiciary" ? Landmark : Shield;
  return (
    <article className="card group relative flex h-full flex-col p-5 transition-[box-shadow,border-color] duration-300 hover:border-foreground/15 hover:shadow-[var(--shadow-card-hover)] sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-semibold",
            item.source === "judiciary"
              ? "bg-accent text-accent-foreground"
              : "bg-info/10 text-info",
          )}
        >
          <SourceIcon className="h-3.5 w-3.5" aria-hidden />
          {meta.short}
        </span>
        {item.category && (
          <span className="rounded-full border border-border px-2.5 py-0.5 text-[0.72rem] font-medium text-muted-foreground">
            {item.category}
          </span>
        )}
        {item.published_at && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            <time dateTime={item.published_at}>{formatDate(item.published_at)}</time>
          </span>
        )}
      </div>

      <h3 className="mt-3 text-[1.0625rem] font-bold leading-snug tracking-tight sm:text-lg">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="transition-colors after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] group-hover:text-brass"
        >
          {item.title}
          <span className="sr-only"> (opens {meta.host} in a new tab)</span>
        </a>
      </h3>

      {item.summary ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
      ) : item.summary_withheld ? (
        <p className="mt-2 text-sm italic leading-relaxed text-muted-foreground">
          Summary withheld to protect the people involved — read the official statement.
        </p>
      ) : null}

      <div aria-hidden className="min-h-1 flex-1" />
      <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold hover:text-brass"
        >
          Read on {meta.host}
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </a>
        <a
          href={reportConcernHref(item)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Flag className="h-3.5 w-3.5" aria-hidden /> Report a concern
        </a>
      </div>
    </article>
  );
}

export function FeedCardSkeleton() {
  return (
    <div className="card p-5 sm:p-6" aria-hidden>
      <div className="flex gap-2">
        <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-28 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mt-4 h-5 w-4/5 animate-pulse rounded-full bg-muted" />
      <div className="mt-3 h-3.5 w-full animate-pulse rounded-full bg-muted/70" />
      <div className="mt-2 h-3.5 w-2/3 animate-pulse rounded-full bg-muted/70" />
      <div className="mt-5 h-9 w-40 animate-pulse rounded-full bg-muted" />
    </div>
  );
}
