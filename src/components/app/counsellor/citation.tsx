import { BookOpen, Gavel, Library, Scale, ExternalLink, ArrowUpRight, BadgeCheck } from "lucide-react";
import {
  AUTHORITY_HINT,
  AUTHORITY_LABEL,
  type CounsellorSource,
  type SourceAuthority,
} from "@/lib/assistant-sources";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const AUTHORITY_STYLES: Record<SourceAuthority, string> = {
  judgment: "border-brass/35 bg-brass/10 text-brass",
  legislation: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  editorial: "border-border bg-secondary text-muted-foreground",
  catalogue: "border-border bg-secondary/80 text-muted-foreground",
  news: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
};

function SourceIcon({ authority }: { authority: SourceAuthority }) {
  if (authority === "judgment") return <Gavel className="h-3.5 w-3.5" aria-hidden />;
  if (authority === "legislation") return <Scale className="h-3.5 w-3.5" aria-hidden />;
  if (authority === "editorial") return <BookOpen className="h-3.5 w-3.5" aria-hidden />;
  if (authority === "news") return <ExternalLink className="h-3.5 w-3.5" aria-hidden />;
  return <Library className="h-3.5 w-3.5" aria-hidden />;
}

function MetaRow({ source }: { source: CounsellorSource }) {
  const sourceDate = source.decidedOn ?? source.publishedAt ?? null;
  const indexed = source.indexedAt ?? null;
  return (
    <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      {source.court && <span>{source.court}</span>}
      {sourceDate && (
        <span>
          <span className="text-muted-foreground/80">Dated </span>
          {formatDate(sourceDate)}
        </span>
      )}
      {!sourceDate && source.year ? <span>{source.year}</span> : null}
      {source.caseNumber && <span>{source.caseNumber}</span>}
      {indexed && (
        <span className="inline-flex items-center gap-1 text-brass/90">
          <BadgeCheck className="h-3 w-3" aria-hidden />
          Indexed {formatDate(indexed)}
        </span>
      )}
      {source.externalUrl && !indexed && (
        <span className="text-brass/80">Original available</span>
      )}
    </div>
  );
}

export function CitationInline({
  source,
  index,
  onOpen,
}: {
  source: CounsellorSource;
  index: number;
  onOpen: (source: CounsellorSource) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(source)}
      className="counsellor-cite-chip mx-0.5 inline-flex translate-y-[-1px] items-center gap-1 rounded-md border border-brass/30 bg-brass/10 px-1.5 py-0.5 align-baseline text-[11px] font-semibold text-brass shadow-[inset_0_1px_0_oklch(1_0_0/0.25)] transition-[background-color,box-shadow,transform] hover:bg-brass/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/40 active:scale-[0.98]"
      aria-label={`Open source ${index}: ${source.title}`}
    >
      <span aria-hidden>[{index}]</span>
      <span className="max-w-[min(9rem,40vw)] truncate font-medium sm:max-w-[12rem]">
        {source.title}
      </span>
    </button>
  );
}

export function CitationCard({
  source,
  index,
  onOpen,
  compact,
}: {
  source: CounsellorSource;
  index?: number;
  onOpen: (source: CounsellorSource) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(source)}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border border-border/80 bg-card/90 text-left shadow-sm transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-brass/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/40",
        compact ? "p-3" : "p-3.5 sm:p-4",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brass/35 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
      />
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "inline-flex max-w-[85%] items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
            AUTHORITY_STYLES[source.authority],
          )}
        >
          <SourceIcon authority={source.authority} />
          <span className="truncate">{AUTHORITY_LABEL[source.authority]}</span>
        </span>
        {typeof index === "number" && (
          <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">[{index}]</span>
        )}
      </div>
      <p className="mt-2 font-display text-sm font-semibold leading-snug text-foreground group-hover:text-brass sm:text-[15px]">
        {source.title}
      </p>
      {source.subtitle && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:line-clamp-1">
          {source.subtitle}
        </p>
      )}
      {!compact && source.summary && (
        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground sm:line-clamp-2">
          {source.summary}
        </p>
      )}
      <MetaRow source={source} />
    </button>
  );
}

export function SourcePreview({
  source,
  open,
  onOpenChange,
}: {
  source: CounsellorSource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!source) return null;

  const sourceDate = source.decidedOn ?? source.publishedAt ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto p-0 sm:max-w-md">
        <div className="relative border-b border-border/70 px-5 pb-4 pt-6 sm:px-6">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-brass/15 blur-3xl"
          />
          <SheetHeader className="space-y-3 text-left">
            <span
              className={cn(
                "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                AUTHORITY_STYLES[source.authority],
              )}
            >
              <SourceIcon authority={source.authority} />
              {AUTHORITY_LABEL[source.authority]}
            </span>
            <SheetTitle className="font-display text-xl leading-snug sm:text-2xl">
              {source.title}
            </SheetTitle>
            <SheetDescription className="text-sm leading-relaxed">
              {AUTHORITY_HINT[source.authority]}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="space-y-4 px-5 py-5 text-sm sm:px-6">
          {source.subtitle && <p className="text-muted-foreground">{source.subtitle}</p>}

          <dl className="grid gap-3 rounded-2xl border border-border/80 bg-secondary/40 p-4 sm:grid-cols-2">
            {source.court && (
              <div className="sm:col-span-2">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Court
                </dt>
                <dd className="mt-1 text-foreground">{source.court}</dd>
              </div>
            )}
            {source.caseNumber && (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Case number
                </dt>
                <dd className="mt-1 text-foreground">{source.caseNumber}</dd>
              </div>
            )}
            {sourceDate && (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Source date
                </dt>
                <dd className="mt-1 text-foreground">{formatDate(sourceDate)}</dd>
              </div>
            )}
            {source.indexedAt && (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Last indexed
                </dt>
                <dd className="mt-1 inline-flex items-center gap-1.5 text-foreground">
                  <BadgeCheck className="h-3.5 w-3.5 text-brass" aria-hidden />
                  {formatDate(source.indexedAt)}
                </dd>
              </div>
            )}
            {source.category && (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Category
                </dt>
                <dd className="mt-1 text-foreground">{source.category}</dd>
              </div>
            )}
            {source.year && !sourceDate && (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Year
                </dt>
                <dd className="mt-1 text-foreground">{source.year}</dd>
              </div>
            )}
          </dl>

          {source.summary && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Summary
              </p>
              <p className="mt-2 leading-relaxed text-foreground/90">{source.summary}</p>
            </div>
          )}

          <p className="rounded-xl border border-border/70 bg-card/60 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
            LegalFinder hosts catalogue text and aggregations where rights allow. We do not scrape
            ULII. Always open the original when it matters.
          </p>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            {source.kind === "news" && source.externalUrl ? (
              <Button asChild variant="brass" size="sm" className="w-full gap-1.5 sm:w-auto">
                <a href={source.externalUrl} target="_blank" rel="noreferrer">
                  Open original <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            ) : (
              <Button asChild variant="brass" size="sm" className="w-full gap-1.5 sm:w-auto">
                <a href={source.href}>
                  Open on LegalFinder <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            {source.kind === "news" ? (
              <Button asChild variant="outline" size="sm" className="w-full gap-1.5 sm:w-auto">
                <a href={source.href}>
                  Updates feed <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </Button>
            ) : source.externalUrl ? (
              <Button asChild variant="outline" size="sm" className="w-full gap-1.5 sm:w-auto">
                <a href={source.externalUrl} target="_blank" rel="noreferrer">
                  Open original <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
