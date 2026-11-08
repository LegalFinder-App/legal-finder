import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, FileDown, FileText, Gavel, Landmark, SlidersHorizontal } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { LoadingRows, EmptyState, QueryError } from "@/components/common/bits";
import { SearchInput } from "@/components/common/search-input";
import { FilterChipGroup } from "@/components/common/filter-chip";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { judgementsQuery } from "@/lib/queries";
import { prefetchForPage } from "@/lib/prefetch";
import { appSettingsQuery } from "@/lib/app-settings";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/judgements")({
  head: () => ({
    meta: [
      { title: "Court judgements — LegalFinder" },
      {
        name: "description",
        content:
          "Search reported court decisions by court, judge or case number, with structured summaries.",
      },
      { property: "og:title", content: "Court judgements — LegalFinder" },
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

function JudgementsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery(judgementsQuery);
  const [q, setQ] = useState("");
  const [courts, setCourts] = useState<string[]>([]);

  const courtOptions = useMemo(
    () => Array.from(new Set((data ?? []).map((j) => j.court))).sort(),
    [data],
  );

  const items = (data ?? []).filter((j) => {
    const text = `${j.title} ${j.case_number} ${j.court} ${j.judge ?? ""}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    if (courts.length > 0 && !courts.includes(j.court)) return false;
    return true;
  });

  const { page, setPage, totalPages, pageItems } = usePaginatedList(items, 8);

  const filterControls = (
    <FilterChipGroup
      label="Court"
      options={courtOptions}
      value={courts}
      onChange={setCourts}
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
          onChange={setQ}
          label="Search judgements"
          placeholder="Search citation, party or judge"
        />
      </PageHeader>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          <aside className="hidden space-y-6 lg:block">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal className="h-4 w-4 text-brass" /> Filters
            </div>
            {filterControls}
          </aside>

          <div>
            <div className="mb-5 flex items-center justify-between gap-3 lg:block">
              <p className="text-sm text-muted-foreground">
                {isLoading ? "Loading…" : `${items.length} judgements`}
              </p>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Filters
                    {courts.length > 0 && (
                      <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-brass text-[0.65rem] font-semibold text-accent-foreground">
                        {courts.length}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85vw] overflow-y-auto sm:max-w-sm">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-brass" /> Filters
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">{filterControls}</div>
                </SheetContent>
              </Sheet>
            </div>
            {isLoading ? (
              <LoadingRows rows={6} />
            ) : isError ? (
              <QueryError
                message={error instanceof Error ? error.message : undefined}
                onRetry={() => refetch()}
              />
            ) : items.length === 0 ? (
              <EmptyState icon={<Gavel className="h-8 w-8" />} title="No judgements found" />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2">
                  {pageItems.map((j) => (
                    <article key={j.id} className="card flex min-w-0 flex-col p-5 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[0.72rem] font-semibold text-accent-foreground">
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
                      <p className="mt-1.5 font-mono text-xs text-brass">{j.case_number}</p>
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
                            className="press inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/88 sm:w-auto sm:px-5"
                          >
                            <FileDown className="h-4 w-4" aria-hidden /> Download full text
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
    </PublicLayout>
  );
}
