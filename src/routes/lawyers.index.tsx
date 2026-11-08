import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { LawyerCard, LawyerCardSkeleton } from "@/components/common/lawyer-card";
import { EmptyState, QueryError } from "@/components/common/bits";
import { SearchInput } from "@/components/common/search-input";
import { FilterChipGroup } from "@/components/common/filter-chip";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { publicLawyersQuery, type Lawyer } from "@/lib/queries";
import { cn } from "@/lib/utils";

const SORTS = [
  { id: "recommended", label: "Recommended" },
  { id: "rating", label: "Highest rated" },
  { id: "fee", label: "Lowest fee" },
] as const;
type SortId = (typeof SORTS)[number]["id"];

// Display order only; "recommended" keeps the order the directory query returns.
const sorters: Record<SortId, ((a: Lawyer, b: Lawyer) => number) | null> = {
  recommended: null,
  rating: (a, b) => b.rating - a.rating || b.review_count - a.review_count,
  fee: (a, b) =>
    (a.consultation_fee ?? Number.POSITIVE_INFINITY) -
    (b.consultation_fee ?? Number.POSITIVE_INFINITY),
};

export const Route = createFileRoute("/lawyers/")({
  head: () => ({
    meta: [
      { title: "Advocate directory — LegalFinder" },
      {
        name: "description",
        content:
          "Search Uganda Law Council-verified advocates by practice area, district, language and consultation fee. Read reviews and book directly.",
      },
      { property: "og:title", content: "Advocate directory — LegalFinder" },
      {
        property: "og:description",
        content: "Uganda Law Council-verified advocates by practice area, district and fee.",
      },
    ],
  }),
  component: LawyersPage,
});

function LawyersPage() {
  const { data, isLoading, isError, error, refetch } = useQuery(publicLawyersQuery());
  const [q, setQ] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [counties, setCounties] = useState<string[]>([]);
  const [acceptingOnly, setAcceptingOnly] = useState(false);
  const [sort, setSort] = useState<SortId>("recommended");

  const areaOptions = useMemo(
    () => Array.from(new Set((data ?? []).flatMap((l) => l.practice_areas))).sort(),
    [data],
  );
  const countyOptions = useMemo(
    () => Array.from(new Set((data ?? []).map((l) => l.county).filter(Boolean) as string[])).sort(),
    [data],
  );

  const filtered = (data ?? []).filter((l) => {
    const text = `${l.full_name} ${l.firm ?? ""} ${l.headline ?? ""}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    if (areas.length > 0 && !areas.some((area) => l.practice_areas.includes(area))) return false;
    if (counties.length > 0 && (!l.county || !counties.includes(l.county))) return false;
    if (acceptingOnly && !l.accepting_clients) return false;
    return true;
  });
  const sorter = sorters[sort];
  const results = sorter ? [...filtered].sort(sorter) : filtered;

  const { page, setPage, totalPages, pageItems } = usePaginatedList(results, 12);

  const activeFilterCount = areas.length + counties.length + (acceptingOnly ? 1 : 0);

  const filterControls: ReactNode = (
    <>
      <FilterChipGroup
        label="Practice area"
        options={areaOptions}
        value={areas}
        onChange={setAreas}
        multiple
        variant="block"
      />
      <FilterChipGroup
        label="District"
        options={countyOptions}
        value={counties}
        onChange={setCounties}
        variant="block"
      />

      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 text-sm font-medium">
        Accepting new clients
        <input
          type="checkbox"
          role="switch"
          checked={acceptingOnly}
          onChange={(e) => setAcceptingOnly(e.target.checked)}
          className="relative h-6 w-10 shrink-0 cursor-pointer appearance-none rounded-full bg-input transition-colors before:absolute before:left-0.5 before:top-0.5 before:h-5 before:w-5 before:rounded-full before:bg-card before:shadow-xs before:transition-transform before:content-[''] checked:bg-success checked:before:translate-x-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      </label>
    </>
  );

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Directory"
        title="Find a verified advocate"
        description="Every advocate on LegalFinder is checked against the roll before their profile is published."
      >
        <SearchInput
          value={q}
          onChange={setQ}
          label="Search advocates"
          placeholder="Search by name, firm or specialisation"
        />
      </PageHeader>

      <div className="container-page py-10 sm:py-12">
        <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-[calc(var(--header-h)+1.5rem)] space-y-8 rounded-3xl border border-border bg-card/60 p-5">
              <div className="flex items-center gap-2 text-sm font-bold">
                <SlidersHorizontal className="h-4 w-4 text-brass" aria-hidden /> Filters
              </div>
              {filterControls}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div
                role="group"
                aria-label="Sort advocates"
                className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 sm:pb-0"
              >
                {SORTS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSort(option.id)}
                    aria-pressed={sort === option.id}
                    className={cn(
                      "press inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold",
                      sort === option.id
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {isLoading ? "Loading advocates…" : `${results.length} advocates`}
                </p>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden">
                      <SlidersHorizontal />
                      Filters
                      {activeFilterCount > 0 && (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.68rem] font-bold text-primary-foreground">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="px-5 pt-5">
                    <div
                      aria-hidden
                      className="mx-auto -mt-2 mb-3 h-1.5 w-12 rounded-full bg-border"
                    />
                    <SheetHeader className="text-left">
                      <SheetTitle className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-brass" aria-hidden /> Filters
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-8">{filterControls}</div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
            {isLoading ? (
              <div
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3"
                role="status"
                aria-label="Loading advocates"
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <LawyerCardSkeleton key={i} />
                ))}
              </div>
            ) : isError ? (
              <QueryError
                message={error instanceof Error ? error.message : undefined}
                onRetry={() => refetch()}
              />
            ) : results.length === 0 ? (
              <EmptyState
                icon={<SearchX />}
                title="No advocates match those filters"
                description="Try widening your search or clearing a filter."
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQ("");
                      setAreas([]);
                      setCounties([]);
                      setAcceptingOnly(false);
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {pageItems.map((l) => (
                    <LawyerCard key={l.id} lawyer={l} />
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
