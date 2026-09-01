import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { LawyerCard } from "@/components/common/lawyer-card";
import { EmptyState, LoadingRows, QueryError } from "@/components/common/bits";
import { SearchInput } from "@/components/common/search-input";
import { FilterChipGroup } from "@/components/common/filter-chip";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { Button } from "@/components/ui/button";
import { publicLawyersQuery } from "@/lib/queries";

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

  const areaOptions = useMemo(
    () => Array.from(new Set((data ?? []).flatMap((l) => l.practice_areas))).sort(),
    [data],
  );
  const countyOptions = useMemo(
    () => Array.from(new Set((data ?? []).map((l) => l.county).filter(Boolean) as string[])).sort(),
    [data],
  );

  const results = (data ?? []).filter((l) => {
    const text = `${l.full_name} ${l.firm ?? ""} ${l.headline ?? ""}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    if (areas.length > 0 && !areas.some((area) => l.practice_areas.includes(area))) return false;
    if (counties.length > 0 && (!l.county || !counties.includes(l.county))) return false;
    if (acceptingOnly && !l.accepting_clients) return false;
    return true;
  });

  const { page, setPage, totalPages, pageItems } = usePaginatedList(results, 12);

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

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-8">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal className="h-4 w-4 text-brass" /> Filters
            </div>

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

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={acceptingOnly}
                onChange={(e) => setAcceptingOnly(e.target.checked)}
                className="h-4 w-4 accent-[oklch(0.66_0.113_74)]"
              />
              Accepting new clients
            </label>
          </aside>

          <div>
            <p className="mb-5 text-sm text-muted-foreground">
              {isLoading ? "Loading…" : `${results.length} advocates`}
            </p>
            {isLoading ? (
              <LoadingRows rows={6} />
            ) : isError ? (
              <QueryError
                message={error instanceof Error ? error.message : undefined}
                onRetry={() => refetch()}
              />
            ) : results.length === 0 ? (
              <EmptyState
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
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
