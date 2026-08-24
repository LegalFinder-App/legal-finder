import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { LawyerCard } from "@/components/common/lawyer-card";
import { EmptyState, LoadingRows, QueryError } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { publicLawyersQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

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
  const [area, setArea] = useState<string | null>(null);
  const [county, setCounty] = useState<string | null>(null);
  const [acceptingOnly, setAcceptingOnly] = useState(false);

  const areas = useMemo(
    () => Array.from(new Set((data ?? []).flatMap((l) => l.practice_areas))).sort(),
    [data],
  );
  const counties = useMemo(
    () => Array.from(new Set((data ?? []).map((l) => l.county).filter(Boolean) as string[])).sort(),
    [data],
  );

  const results = (data ?? []).filter((l) => {
    const text = `${l.full_name} ${l.firm ?? ""} ${l.headline ?? ""}`.toLowerCase();
    if (q && !text.includes(q.toLowerCase())) return false;
    if (area && !l.practice_areas.includes(area)) return false;
    if (county && l.county !== county) return false;
    if (acceptingOnly && !l.accepting_clients) return false;
    return true;
  });

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Directory"
        title="Find a verified advocate"
        description="Every advocate on LegalFinder is checked against the roll before their profile is published."
      >
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-foreground/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, firm or specialisation"
            className="h-12 w-full rounded-md border border-ink-foreground/20 bg-ink-foreground/5 pl-10 pr-4 text-sm text-ink-foreground placeholder:text-ink-foreground/40 focus:border-brass focus:outline-none"
          />
        </div>
      </PageHeader>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-8">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal className="h-4 w-4 text-brass" /> Filters
            </div>

            <FilterGroup label="Practice area" options={areas} value={area} onChange={setArea} />
            <FilterGroup label="District" options={counties} value={county} onChange={setCounty} />

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
                      setArea(null);
                      setCounty(null);
                      setAcceptingOnly(false);
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((l) => (
                  <LawyerCard key={l.id} lawyer={l} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <p className="eyebrow text-muted-foreground">{label}</p>
      <div className="mt-3 flex flex-wrap gap-1.5 lg:flex-col lg:items-start">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(value === o ? null : o)}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
              value === o
                ? "bg-brass/15 font-semibold text-accent-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
