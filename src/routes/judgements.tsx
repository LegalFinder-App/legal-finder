import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gavel, FileDown, SlidersHorizontal } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { LoadingRows, EmptyState, QueryError } from "@/components/common/bits";
import { SearchInput } from "@/components/common/search-input";
import { FilterChipGroup } from "@/components/common/filter-chip";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { judgementsQuery } from "@/lib/queries";

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
                <div className="grid gap-5 sm:grid-cols-2">
                  {pageItems.map((j) => (
                    <article
                      key={j.id}
                      className="flex flex-col rounded-lg border border-border bg-card p-6 shadow-plate"
                    >
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
                        <span className="text-brass">{j.case_number}</span>
                        {j.decided_on && <span>{new Date(j.decided_on).toLocaleDateString()}</span>}
                      </div>
                      <h2 className="mt-2 font-display text-lg font-semibold leading-snug">
                        {j.title}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">{j.court}</p>
                      {j.judge && (
                        <p className="mt-1 text-sm text-muted-foreground">Before {j.judge}</p>
                      )}
                      {j.summary && (
                        <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                          {j.summary}
                        </p>
                      )}
                      {j.file_url && (
                        <a
                          href={j.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-brass hover:underline"
                        >
                          <FileDown className="h-4 w-4" /> Download full text
                        </a>
                      )}
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
