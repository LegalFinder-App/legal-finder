import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Clock3,
  Filter,
  Gavel,
  Library,
  Loader2,
  Newspaper,
  PanelRightClose,
  PanelRightOpen,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AUTHORITY_LABEL,
  DEFAULT_RESEARCH_FILTERS,
  emptyFacets,
  type CounsellorSource,
  type ResearchFacets,
  type ResearchFilters,
  type SourceKind,
} from "@/lib/assistant-sources";
import { searchCounsellorResearch } from "@/lib/assistant-research";
import { cn } from "@/lib/utils";
import { CitationCard } from "./citation";
import type { ResearchHistoryEntry } from "./storage";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seededQuery?: string;
  seededSources?: CounsellorSource[];
  history: ResearchHistoryEntry[];
  onHistoryChange: (entries: ResearchHistoryEntry[]) => void;
  onOpenSource: (source: CounsellorSource) => void;
  onAskAboutSource: (source: CounsellorSource) => void;
  onUseInChat: (query: string) => void;
  /** Sheet layout: mobile Results | Preview segments, no desktop collapse chrome. */
  variant?: "panel" | "sheet";
};

const KIND_OPTIONS: Array<{ id: SourceKind; label: string; icon: typeof Gavel }> = [
  { id: "judgment", label: "Judgments", icon: Gavel },
  { id: "library", label: "Library", icon: Library },
  { id: "advice", label: "Guides", icon: BookOpen },
  { id: "news", label: "Headlines", icon: Newspaper },
];

export function ResearchPanel({
  open,
  onOpenChange,
  seededQuery = "",
  seededSources = [],
  history,
  onHistoryChange,
  onOpenSource,
  onAskAboutSource,
  onUseInChat,
  variant = "panel",
}: Props) {
  const isSheet = variant === "sheet";
  const [query, setQuery] = useState(seededQuery);
  const [filters, setFilters] = useState<ResearchFilters>(DEFAULT_RESEARCH_FILTERS);
  const [facets, setFacets] = useState<ResearchFacets>(emptyFacets());
  const [sources, setSources] = useState<CounsellorSource[]>(seededSources);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<"results" | "preview">("results");
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (seededSources.length > 0) {
      setSources(seededSources);
      if (seededQuery) setQuery(seededQuery);
    }
  }, [seededSources, seededQuery]);

  useEffect(() => {
    if (!open || sources.length === 0) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Enter") return;
      event.preventDefault();
      const keys = sources.map((s) => `${s.kind}:${s.id}`);
      const current = selectedId && keys.includes(selectedId) ? keys.indexOf(selectedId) : 0;
      if (event.key === "Enter") {
        const pick = sources[current];
        if (pick) {
          setSelectedId(`${pick.kind}:${pick.id}`);
          if (isSheet) setMobilePane("preview");
          onOpenSource(pick);
        }
        return;
      }
      const next =
        event.key === "ArrowDown"
          ? Math.min(keys.length - 1, current + 1)
          : Math.max(0, current - 1);
      setSelectedId(keys[next] ?? null);
      if (isSheet) setMobilePane("results");
      const button = resultsRef.current?.querySelectorAll<HTMLButtonElement>("[data-research-result]")[
        next
      ];
      button?.scrollIntoView({ block: "nearest" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, sources, selectedId, isSheet, onOpenSource]);

  const runSearch = async (nextQuery = query, nextFilters = filters, recordHistory = true) => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchCounsellorResearch(nextQuery, nextFilters);
      setSources(result.sources);
      setFacets(result.facets);
      setSelectedId(result.sources[0] ? `${result.sources[0].kind}:${result.sources[0].id}` : null);
      if (recordHistory && nextQuery.trim()) {
        const entry: ResearchHistoryEntry = {
          id: crypto.randomUUID(),
          query: nextQuery.trim(),
          filters: nextFilters,
          resultCount: result.sources.length,
          at: new Date().toISOString(),
        };
        onHistoryChange([entry, ...history.filter((h) => h.query !== entry.query)].slice(0, 20));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research search failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    // Initial browse when the research pane opens with no seeded results.
    if (sources.length === 0 && !loading) {
      void runSearch("", filters, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-only bootstrap
  }, [open]);

  const selected = sources.find((s) => `${s.kind}:${s.id}` === selectedId) ?? sources[0] ?? null;

  const toggleKind = (kind: SourceKind) => {
    setFilters((prev) => {
      const has = prev.kinds.includes(kind);
      const kinds = has ? prev.kinds.filter((k) => k !== kind) : [...prev.kinds, kind];
      return { ...prev, kinds: kinds.length ? kinds : [...DEFAULT_RESEARCH_FILTERS.kinds] };
    });
  };

  if (!open && !isSheet) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="absolute right-3 top-3 z-20 hidden h-9 items-center gap-1.5 rounded-xl border border-border bg-card/95 px-3 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground lg:inline-flex"
        aria-label="Open research panel"
      >
        <PanelRightOpen className="h-3.5 w-3.5" />
        Sources
      </button>
    );
  }

  const resultsList = (
    <>
      {loading && sources.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-border/80 bg-secondary/40 p-4 text-sm">
          <p className="font-medium text-foreground">Couldn’t load research results</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => void runSearch()}
          >
            Retry
          </Button>
        </div>
      ) : sources.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-6 text-center">
          <p className="text-sm font-medium">No matching sources</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try broader keywords or clear the date and court filters.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {["bail after arrest", "unfair dismissal", "land succession"].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="rounded-full border border-border/80 bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-brass/40 hover:text-foreground"
                onClick={() => {
                  setQuery(suggestion);
                  void runSearch(suggestion, filters);
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div ref={resultsRef} className="space-y-2" role="listbox" aria-label="Research results">
          <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {sources.length} result{sources.length === 1 ? "" : "s"}
            <span className="ml-1.5 font-normal normal-case tracking-normal">
              · ↑↓ Enter
            </span>
          </p>
          {sources.map((source, index) => {
            const key = `${source.kind}:${source.id}`;
            const active = key === (selected ? `${selected.kind}:${selected.id}` : "");
            return (
              <button
                key={key}
                type="button"
                data-research-result
                role="option"
                aria-selected={active}
                onClick={() => {
                  setSelectedId(key);
                  if (isSheet) setMobilePane("preview");
                }}
                className={cn(
                  "counsellor-rail-item w-full rounded-xl border p-3 text-left transition-colors",
                  active
                    ? "border-brass/40 bg-brass/10"
                    : "border-border/70 bg-card/80 hover:border-brass/30",
                )}
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brass">
                    {AUTHORITY_LABEL[source.authority]}
                  </p>
                  <span className="text-[10px] text-muted-foreground">[{index + 1}]</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">
                  {source.title}
                </p>
                {source.subtitle && (
                  <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                    {source.subtitle}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );

  const previewPane = selected ? (
    <div className="space-y-3">
      <CitationCard source={selected} onOpen={onOpenSource} />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="brass"
          size="sm"
          className="rounded-xl"
          onClick={() => onAskAboutSource(selected)}
        >
          Ask Counsellor about this
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => onOpenSource(selected)}
        >
          Preview
        </Button>
      </div>
      {selected.summary && (
        <div className="rounded-xl border border-border/70 bg-secondary/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Preview
          </p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{selected.summary}</p>
        </div>
      )}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Authority labels mark LegalFinder catalogue entries. Editorial guides are not official law.
        Open the original when it matters — we do not scrape ULII.
      </p>
    </div>
  ) : (
    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
      Select a result to preview it here.
    </div>
  );

  return (
    <aside
      className={cn(
        "flex h-full w-full max-w-full shrink-0 flex-col bg-gradient-to-b from-card/70 via-card/45 to-background/30 backdrop-blur-md",
        !isSheet && "border-l border-border/70 lg:w-[min(26rem,40vw)] xl:w-[min(28rem,36vw)]",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-3 sm:px-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">Legal Research</p>
          <p className="truncate text-[11px] text-muted-foreground">
            Corpus search · judgments, guides, headlines
          </p>
        </div>
        {!isSheet && (
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Collapse research panel"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-3 border-b border-border/70 px-3 py-3 sm:px-4">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void runSearch();
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Research topic or keywords"
              className="h-10 rounded-xl pl-8 text-sm sm:h-9"
              aria-label="Research query"
            />
          </div>
          <Button
            type="submit"
            variant="brass"
            size="sm"
            disabled={loading}
            className="h-10 w-full rounded-xl sm:h-9 sm:w-auto"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </form>

        <div className="counsellor-research-chips flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {KIND_OPTIONS.map(({ id, label, icon: Icon }) => {
            const active = filters.kinds.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleKind(id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                  active
                    ? "border-brass/40 bg-brass/12 text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
                {facets.counts[id] > 0 && (
                  <span className="text-muted-foreground">({facets.counts[id]})</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select
            value={filters.court ?? "all"}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, court: value === "all" ? null : value }))
            }
          >
            <SelectTrigger className="h-9 rounded-xl text-xs" aria-label="Court filter">
              <SelectValue placeholder="All courts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courts</SelectItem>
              {facets.courts.map((court) => (
                <SelectItem key={court} value={court}>
                  {court}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.category ?? "all"}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, category: value === "all" ? null : value }))
            }
          >
            <SelectTrigger className="h-9 rounded-xl text-xs" aria-label="Category filter">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {facets.categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              From
            </span>
            <Input
              type="date"
              value={filters.dateFrom ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  dateFrom: event.target.value || null,
                }))
              }
              className="h-9 rounded-xl text-xs"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              To
            </span>
            <Input
              type="date"
              value={filters.dateTo ?? ""}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  dateTo: event.target.value || null,
                }))
              }
              className="h-9 rounded-xl text-xs"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 rounded-xl text-xs"
            onClick={() => void runSearch(query, filters)}
            disabled={loading}
          >
            <Filter className="h-3.5 w-3.5" />
            Apply filters
          </Button>
          <button
            type="button"
            className="text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => {
              setFilters(DEFAULT_RESEARCH_FILTERS);
              void runSearch(query, DEFAULT_RESEARCH_FILTERS, false);
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {isSheet && (
        <div
          className="grid grid-cols-2 gap-1 border-b border-border/70 bg-secondary/30 p-2"
          role="tablist"
          aria-label="Research panes"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobilePane === "results"}
            onClick={() => setMobilePane("results")}
            className={cn(
              "rounded-lg px-2 py-2 text-xs font-medium transition-colors",
              mobilePane === "results"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Results
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobilePane === "preview"}
            onClick={() => setMobilePane("preview")}
            className={cn(
              "rounded-lg px-2 py-2 text-xs font-medium transition-colors",
              mobilePane === "preview"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Preview
          </button>
        </div>
      )}

      <div
        className={cn(
          "grid min-h-0 flex-1",
          isSheet
            ? "grid-rows-1"
            : "grid-rows-[minmax(0,1fr)_auto] lg:grid-rows-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
        )}
      >
        <div
          className={cn(
            "min-h-0 overflow-y-auto p-3",
            isSheet
              ? mobilePane === "results"
                ? "block"
                : "hidden"
              : "border-b border-border/70 lg:border-b-0 lg:border-r",
          )}
          role={isSheet ? "tabpanel" : undefined}
        >
          {resultsList}
        </div>

        <div
          className={cn(
            "min-h-0 overflow-y-auto p-3",
            isSheet ? (mobilePane === "preview" ? "block" : "hidden") : "block",
          )}
          role={isSheet ? "tabpanel" : undefined}
        >
          {previewPane}
        </div>
      </div>

      {history.length > 0 && (
        <div className="border-t border-border/70 px-3 py-2">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Clock3 className="h-3 w-3" /> Research history
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {history.slice(0, 8).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setQuery(entry.query);
                  setFilters(entry.filters);
                  void runSearch(entry.query, entry.filters, false);
                  onUseInChat(entry.query);
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/80 bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-brass/35 hover:text-foreground"
              >
                {entry.query}
                <ChevronRight className="h-3 w-3 opacity-60" />
              </button>
            ))}
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={() => onHistoryChange([])}
              aria-label="Clear research history"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
