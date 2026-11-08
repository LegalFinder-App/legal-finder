import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarDays,
  FileDown,
  FileText,
  Gavel,
  Landmark,
  Scale,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { EmptyState, QueryError } from "@/components/common/bits";
import { ListingToolbar, StatStrip } from "@/components/common/listing-toolbar";
import { SearchInput } from "@/components/common/search-input";
import { FilterChipGroup } from "@/components/common/filter-chip";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { judgementsQuery } from "@/lib/queries";
import { prefetchForPage } from "@/lib/prefetch";
import { appSettingsQuery } from "@/lib/app-settings";
import { formatDate } from "@/lib/format";
import { delay } from "@/lib/motion";
import { ULII_ATTRIBUTION, uliiSearchUrl } from "@/lib/legal-feed/meta";

export const Route = createFileRoute("/judgements")({
  head: () => ({
    meta: [
      { title: "LegalFinder | Judgements" },
      {
        name: "description",
        content:
          "Search reported court decisions by court, judge or case number, with structured summaries.",
      },
      { property: "og:title", content: "LegalFinder | Judgements" },
      { property: "og:description", content: "Reported decisions with structured summaries." },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    prefetchForPage([
      queryClient.prefetchQuery(judgementsQuery),
      queryClient.prefetchQuery(appSettingsQuery),
    ]),
  component: JudgementsPage,
});

const SORTS = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "title", label: "A–Z" },
];

function JudgementsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery(judgementsQuery);
  const [q, setQ] = useState("");
  const [courts, setCourts] = useState<string[]>([]);
  const [sort, setSort] = useState("newest");

  const all = useMemo(() => data ?? [], [data]);
  const courtOptions = useMemo(() => Array.from(new Set(all.map((j) => j.court))).sort(), [all]);
  const latest = all
    .map((j) => j.decided_on)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = all.filter((j) => {
      const text = `${j.title} ${j.case_number} ${j.court} ${j.judge ?? ""}`.toLowerCase();
      if (term && !text.includes(term)) return false;
      if (courts.length > 0 && !courts.includes(j.court)) return false;
      return true;
    });
    return [...list].sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : (sort === "oldest" ? 1 : -1) * (a.decided_on ?? "").localeCompare(b.decided_on ?? ""),
    );
  }, [all, q, courts, sort]);

  const { page, setPage, totalPages, pageItems } = usePaginatedList(items, 8);

  const filterControls = (
    <FilterChipGroup
      label="Court"
      options={courtOptions}
      value={courts}
      onChange={(next) => {
        setCourts(next);
        setPage(1);
      }}
      multiple
      variant="block"
    />
  );

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Case law"
        title="Reported judgements"
        description="Decisions published by the judiciary, searchable by court, judge and case number."
      >
        <SearchInput
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          label="Search judgements"
          placeholder="Search citation, party or judge"
        />
        <div className="mt-6 max-w-3xl">
          <StatStrip
            loading={isLoading}
            items={[
              { icon: Gavel, label: "Judgements", value: all.length },
              { icon: Landmark, label: "Courts", value: courtOptions.length },
              {
                icon: CalendarDays,
                label: "Latest decision",
                value: latest ? formatDate(latest, { month: "short", year: "numeric" }) : "—",
              },
            ]}
          />
        </div>
      </PageHeader>

      <div className="container-page py-10 sm:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
          <aside className="hidden lg:block">
            <div className="card sticky top-[calc(var(--header-h)+1.5rem)] space-y-5 p-5">
              <p className="flex items-center gap-2 text-sm font-bold">
                <SlidersHorizontal className="h-4 w-4 text-brass" aria-hidden /> Filters
              </p>
              {filterControls}
              {courts.length > 0 && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setCourts([])}>
                  Clear courts
                </Button>
              )}
            </div>
          </aside>

          <div className="min-w-0">
            <ListingToolbar
              sorts={SORTS}
              sort={sort}
              onSort={setSort}
              resultLabel={
                isLoading
                  ? undefined
                  : `${items.length} ${items.length === 1 ? "judgement" : "judgements"}`
              }
              trailing={
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="rounded-full lg:hidden">
                      <SlidersHorizontal />
                      Courts
                      {courts.length > 0 && (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.68rem] font-bold text-primary-foreground">
                          {courts.length}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    className="max-h-[85dvh] overflow-y-auto rounded-t-[1.75rem] px-5 pb-[calc(1.5rem+var(--safe-bottom,0px))] pt-5"
                  >
                    <div aria-hidden className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" />
                    <SheetHeader className="p-0 text-left">
                      <SheetTitle className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-brass" aria-hidden /> Filter by
                        court
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-5">{filterControls}</div>
                  </SheetContent>
                </Sheet>
              }
            />

            {/* The full body of Ugandan case law lives on ULII; we link out, never copy. */}
            <a
              href={uliiSearchUrl(q.trim() || "judgment")}
              target="_blank"
              rel="noreferrer"
              className="card card-interactive group mt-5 flex items-center gap-4 p-4 sm:p-5"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl surface-ink">
                <Scale className="h-5 w-5 text-brass" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold leading-snug tracking-tight">
                  {q.trim()
                    ? `Search “${q.trim()}” across every Ugandan judgment on ULII`
                    : "Need more? Search every Ugandan judgment on ULII"}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {ULII_ATTRIBUTION} · opens in a new tab
                </span>
              </span>
              <span className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-brass sm:inline-flex">
                <Search className="h-4 w-4" aria-hidden /> Search ULII
                <ArrowUpRight
                  className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-brass sm:hidden" aria-hidden />
            </a>

            <div className="mt-6">
              {isLoading ? (
                <div
                  className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2"
                  role="status"
                  aria-label="Loading judgements"
                >
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="card h-64 p-6" aria-hidden>
                      <div className="h-6 w-40 animate-pulse rounded-full bg-muted" />
                      <div className="mt-5 h-5 w-4/5 animate-pulse rounded-full bg-muted" />
                      <div className="mt-3 h-3 w-24 animate-pulse rounded-full bg-muted/70" />
                      <div className="mt-6 h-3 w-full animate-pulse rounded-full bg-muted/70" />
                      <div className="mt-2 h-3 w-2/3 animate-pulse rounded-full bg-muted/70" />
                    </div>
                  ))}
                </div>
              ) : isError ? (
                <QueryError
                  message={error instanceof Error ? error.message : undefined}
                  onRetry={() => refetch()}
                />
              ) : items.length === 0 ? (
                <EmptyState
                  icon={<Gavel />}
                  title={all.length === 0 ? "No judgements yet" : "No judgements match"}
                  description="Try another search or court, or search ULII above."
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2">
                    {pageItems.map((j, index) => (
                      <article
                        key={`${sort}-${j.id}`}
                        className="animate-rise card relative flex min-w-0 flex-col overflow-hidden p-5 sm:p-6"
                        style={delay(Math.min(index, 8) * 40)}
                      >
                        <span
                          aria-hidden
                          className="absolute inset-y-0 left-0 w-1 bg-[image:var(--gradient-brass)]"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[0.72rem] font-semibold text-accent-foreground">
                            <Landmark className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span className="truncate">{j.court}</span>
                          </span>
                          {j.decided_on && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                              <time dateTime={j.decided_on}>
                                {formatDate(j.decided_on, {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </time>
                            </span>
                          )}
                        </div>
                        <h2 className="mt-4 text-[1.0625rem] font-bold leading-snug tracking-tight sm:text-lg">
                          {j.title}
                        </h2>
                        <p className="mt-1.5 break-words font-mono text-xs text-brass">
                          {j.case_number}
                        </p>
                        {j.judge && (
                          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Gavel className="h-3.5 w-3.5 shrink-0" aria-hidden /> Before {j.judge}
                          </p>
                        )}
                        {j.summary && (
                          <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                            {j.summary}
                          </p>
                        )}
                        <div aria-hidden className="min-h-5 flex-1" />
                        <div className="border-t border-border pt-4">
                          {j.file_url ? (
                            <a
                              href={j.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="press inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto sm:px-5"
                            >
                              <FileDown className="h-4 w-4" aria-hidden /> Download full text
                              <span className="sr-only"> (opens in a new tab)</span>
                            </a>
                          ) : (
                            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <FileText className="h-3.5 w-3.5" aria-hidden /> Summary only
                            </p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                  <PaginationBar
                    page={page}
                    totalPages={totalPages}
                    onChange={setPage}
                    className="mt-10"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
