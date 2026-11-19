import { BookOpen, Gavel, Library, Scale, ExternalLink, ArrowUpRight } from "lucide-react";
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
      <span className="max-w-[9rem] truncate font-medium">{source.title}</span>
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
        compact ? "p-3" : "p-3.5",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brass/35 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
      />
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
            AUTHORITY_STYLES[source.authority],
          )}
        >
          <SourceIcon authority={source.authority} />
          {AUTHORITY_LABEL[source.authority]}
        </span>
        {typeof index === "number" && (
          <span className="text-[11px] font-semibold text-muted-foreground">[{index}]</span>
        )}
      </div>
      <p className="mt-2 font-display text-sm font-semibold leading-snug text-foreground group-hover:text-brass">
        {source.title}
      </p>
      {source.subtitle && <p className="mt-1 text-xs text-muted-foreground">{source.subtitle}</p>}
      {!compact && source.summary && (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {source.summary}
        </p>
      )}
      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {source.court && <span>{source.court}</span>}
        {source.decidedOn && <span>{formatDate(source.decidedOn)}</span>}
        {source.year && !source.decidedOn && <span>{source.year}</span>}
        {source.caseNumber && <span>{source.caseNumber}</span>}
        {source.externalUrl && <span className="text-brass/80">Original available</span>}
      </div>
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="relative space-y-3 text-left">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-brass/10 blur-2xl"
          />
          <span
            className={cn(
              "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
              AUTHORITY_STYLES[source.authority],
            )}
          >
            <SourceIcon authority={source.authority} />
            {AUTHORITY_LABEL[source.authority]}
          </span>
          <SheetTitle className="font-display text-xl leading-snug">{source.title}</SheetTitle>
          <SheetDescription className="text-sm leading-relaxed">
            {AUTHORITY_HINT[source.authority]}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4 text-sm">
          {source.subtitle && <p className="text-muted-foreground">{source.subtitle}</p>}
          <dl className="grid gap-3 rounded-2xl border border-border/80 bg-secondary/40 p-4">
            {source.court && (
              <div>
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
            {source.decidedOn && (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Decided
                </dt>
                <dd className="mt-1 text-foreground">{formatDate(source.decidedOn)}</dd>
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
            {source.year && (
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

          <div className="flex flex-wrap gap-2 pt-2">
            {source.kind === "news" && source.externalUrl ? (
              <Button asChild variant="brass" size="sm" className="gap-1.5">
                <a href={source.externalUrl} target="_blank" rel="noreferrer">
                  Open original <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            ) : (
              <Button asChild variant="brass" size="sm" className="gap-1.5">
                <a href={source.href}>
                  Open on LegalFinder <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            {source.kind === "news" ? (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <a href={source.href}>
                  Updates feed <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </Button>
            ) : source.externalUrl ? (
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <a href={source.externalUrl} target="_blank" rel="noreferrer">
                  Original document <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
