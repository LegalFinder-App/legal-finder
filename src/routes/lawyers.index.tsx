import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  ChevronDown,
  MapPinned,
  Scale,
  SearchX,
  SlidersHorizontal,
  UserCheck,
  X,
} from "lucide-react";
import { PublicLayout } from "@/components/site/public-layout";
import { LawyerCard, LawyerCardSkeleton } from "@/components/common/lawyer-card";
import { EmptyState, QueryError } from "@/components/common/bits";
import { SearchInput } from "@/components/common/search-input";
import { FilterChipGroup } from "@/components/common/filter-chip";
import { StatStrip } from "@/components/common/listing-toolbar";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { publicLawyersQuery, type Lawyer } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { delay, trackSpotlight } from "@/lib/motion";
import { useReveal } from "@/hooks/use-reveal";
import { prefetchForPage } from "@/lib/prefetch";
import { siteMediaQuery } from "@/lib/site-media";
import { appSettingsQuery } from "@/lib/app-settings";

const SORTS = [
  { id: "recommended", label: "Recommended" },
  { id: "rating", label: "Highest rated" },
  { id: "fee", label: "Lowest fee" },
] as const;
type SortId = (typeof SORTS)[number]["id"];
const ACCEPTING = "Accepting new clients";

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
      { title: "LegalFinder | Advocates" },
      {
        name: "description",
        content:
          "Search Uganda Law Council-verified advocates by practice area, district, language and consultation fee. Read reviews and book directly.",
      },
      { property: "og:title", content: "LegalFinder | Advocates" },
      {
        property: "og:description",
        content: "Uganda Law Council-verified advocates by practice area, district and fee.",
      },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    prefetchForPage([
      queryClient.prefetchQuery(publicLawyersQuery()),
      queryClient.prefetchQuery(siteMediaQuery),
      queryClient.prefetchQuery(appSettingsQuery),
    ]),
  component: LawyersPage,
});

function LawyersPage() {
  const { data, isLoading, isError, error, refetch } = useQuery(publicLawyersQuery());
  const [q, setQ] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [counties, setCounties] = useState<string[]>([]);
  const [acceptingOnly, setAcceptingOnly] = useState(false);
  const [sort, setSort] = useState<SortId>("recommended");
  const [showAllAreas, setShowAllAreas] = useState(false);

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
  const clearAll = () => {
    setQ("");
    setAreas([]);
    setCounties([]);
    setAcceptingOnly(false);
  };
  // Keep any selected area visible even when the list is collapsed.
  const visibleAreas = showAllAreas
    ? areaOptions
    : Array.from(new Set([...areaOptions.slice(0, 8), ...areas]));
  const listReveal = useReveal<HTMLDivElement>();

  const filterControls: ReactNode = (
    <>
      <div>
        <FilterChipGroup
          label="Practice area"
          options={visibleAreas}
          value={areas}
          onChange={setAreas}
          multiple
          variant="block"
        />
        {areaOptions.length > 8 && (
          <button
            type="button"
            onClick={() => setShowAllAreas((v) => !v)}
            aria-expanded={showAllAreas}
            className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-full px-3.5 text-sm font-semibold text-brass hover:bg-accent"
          >
            {showAllAreas ? "Show fewer" : `Show all ${areaOptions.length}`}
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", showAllAreas && "rotate-180")}
              aria-hidden
            />
          </button>
        )}
      </div>
      <FilterChipGroup
        label="District"
        options={countyOptions}
        value={counties}
        onChange={setCounties}
        variant="block"
      />

      {/* A filter, not a setting: styled like the other filter options so it can't be
          mistaken for a control that changes an advocate's availability. */}
      <FilterChipGroup
        label="Availability"
        options={[ACCEPTING]}
        value={acceptingOnly ? [ACCEPTING] : []}
        onChange={(v) => setAcceptingOnly(v.length > 0)}
        variant="block"
      />
    </>
  );

  return (
    <PublicLayout>
      <section className="container-page pt-2">
        <div
          onPointerMove={trackSpotlight}
          className="spotlight relative isolate overflow-hidden rounded-[2rem] surface-ink shadow-float dark:ring-1 dark:ring-white/10"
        >
          <picture>
            <source
              type="image/avif"
              srcSet="/images/site/justice-480.avif 480w, /images/site/justice-800.avif 800w, /images/site/justice-1200.avif 1200w"
              sizes="(min-width: 1280px) 1216px, 100vw"
            />
            <img
              src="/images/site/justice-800.webp"
              srcSet="/images/site/justice-480.webp 480w, /images/site/justice-800.webp 800w, /images/site/justice-1200.webp 1200w"
              sizes="(min-width: 1280px) 1216px, 100vw"
              alt=""
              width={1200}
              height={800}
              fetchPriority="high"
              className="absolute inset-0 -z-10 h-full w-full object-cover object-[center_25%] opacity-35"
            />
          </picture>
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(108deg,oklch(0.16_0.035_262/0.96)_0%,oklch(0.16_0.035_262/0.84)_52%,oklch(0.16_0.035_262/0.4)_100%)]"
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-40" />
          <div
            aria-hidden
            className="animate-aurora absolute -right-16 top-0 -z-10 h-72 w-72 rounded-full bg-[oklch(0.78_0.115_80/0.18)] blur-[90px]"
          />

          <div className="grid gap-10 px-5 py-12 sm:px-10 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-12 lg:px-14 lg:py-16">
            <div>
              <p className="animate-rise inline-flex items-center gap-2 rounded-full px-3 py-1 eyebrow text-brass surface-glass-ink">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Directory
              </p>
              <h1
                className="animate-rise mt-4 max-w-2xl text-h1 font-bold text-ink-foreground"
                style={delay(60)}
              >
                Find a{" "}
                <span className="font-serif italic font-medium text-brass">verified advocate</span>
              </h1>
              <p
                className="animate-rise mt-4 max-w-xl text-lead text-ink-foreground/75"
                style={delay(120)}
              >
                Every advocate on LegalFinder is checked against the roll before their profile is
                published.
              </p>
              <div className="animate-rise mt-8 max-w-xl" style={delay(180)}>
                <SearchInput
                  value={q}
                  onChange={(v) => {
                    setQ(v);
                    setPage(1);
                  }}
                  tone="ink"
                  label="Search advocates"
                  placeholder="Search by name, firm or specialisation"
                />
              </div>
            </div>

            <div className="animate-rise" style={delay(240)}>
              <StatStrip
                tone="ink"
                loading={isLoading}
                items={[
                  { icon: BadgeCheck, label: "Advocates", value: (data ?? []).length },
                  { icon: Scale, label: "Practice areas", value: areaOptions.length },
                  { icon: MapPinned, label: "Districts", value: countyOptions.length },
                  {
                    icon: UserCheck,
                    label: "Accepting clients",
                    value: (data ?? []).filter((l) => l.accepting_clients).length,
                  },
                ]}
              />
              <p className="mt-4 max-w-sm text-xs leading-relaxed text-ink-foreground/55">
                Filter by practice area, district and availability. Book or message from a profile.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div id="directory" className="container-page scroll-mt-28 py-10 sm:py-12">
        <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div
              onPointerMove={trackSpotlight}
              className="card-glow spotlight sticky top-[calc(var(--header-h)+1.5rem)] max-h-[calc(100dvh-var(--header-h)-3rem)] space-y-7 overflow-y-auto p-5 [scrollbar-width:thin]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <SlidersHorizontal className="h-4 w-4 text-brass" aria-hidden /> Filters
                </p>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="rounded-full px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
              {filterControls}
            </div>
          </aside>

          <div ref={listReveal} className="min-w-0">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <SortControl value={sort} onChange={setSort} />
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <p className="text-sm text-muted-foreground" aria-live="polite">
                  {isLoading
                    ? "Loading advocates…"
                    : `${results.length} ${results.length === 1 ? "advocate" : "advocates"}`}
                </p>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="rounded-full lg:hidden">
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

            {activeFilterCount > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-2" aria-label="Active filters">
                {[
                  ...areas.map((a) => ({
                    key: `a-${a}`,
                    label: a,
                    remove: () => setAreas(areas.filter((x) => x !== a)),
                  })),
                  ...counties.map((c) => ({
                    key: `c-${c}`,
                    label: c,
                    remove: () => setCounties(counties.filter((x) => x !== c)),
                  })),
                  ...(acceptingOnly
                    ? [
                        {
                          key: "acc",
                          label: "Accepting clients",
                          remove: () => setAcceptingOnly(false),
                        },
                      ]
                    : []),
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={f.remove}
                    aria-label={`Remove filter: ${f.label}`}
                    className="press inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary/8 py-1 pl-3.5 pr-2 text-xs font-semibold text-foreground ring-1 ring-primary/15 hover:bg-primary/12"
                  >
                    {f.label}
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearAll}
                  className="min-h-9 rounded-full px-3 text-xs font-semibold text-brass hover:bg-accent"
                >
                  Clear all
                </button>
              </div>
            )}
            {isLoading ? (
              <div
                className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] gap-4 sm:gap-5"
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
                  <Button variant="outline" onClick={clearAll}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] gap-4 sm:gap-5">
                  {pageItems.map((l, i) => (
                    <div
                      key={`${sort}-${page}-${l.id}`}
                      className="reveal min-w-0"
                      style={delay(Math.min(i, 8) * 60)}
                    >
                      <LawyerCard lawyer={l} />
                    </div>
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

/**
 * Segmented sort control with a sliding indicator. Until it has measured itself (first paint,
 * server render) the active option paints its own background, so there is never a gap.
 */
function SortControl({ value, onChange }: { value: SortId; onChange: (v: SortId) => void }) {
  const refs = useRef<Partial<Record<SortId, HTMLButtonElement | null>>>({});
  const [box, setBox] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[value];
      if (el) setBox({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value]);

  return (
    <div
      role="group"
      aria-label="Sort advocates"
      className="relative -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:w-auto sm:overflow-visible sm:px-0"
    >
      <div className="relative inline-flex shrink-0 gap-1 rounded-full border border-border bg-card p-1 shadow-xs">
        {box && (
          <span
            aria-hidden
            className="absolute bottom-1 top-1 rounded-full bg-primary shadow-xs transition-[transform,width] duration-300 ease-(--ease-out-expo)"
            style={{ width: box.w, transform: `translateX(${box.x}px)`, left: 0 }}
          />
        )}
        {SORTS.map((option) => {
          const active = value === option.id;
          return (
            <button
              key={option.id}
              ref={(el) => {
                refs.current[option.id] = el;
              }}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.id)}
              className={cn(
                "relative z-10 inline-flex min-h-9 items-center whitespace-nowrap rounded-full px-3 text-[0.8125rem] font-semibold transition-colors duration-200 min-[400px]:px-4 sm:text-sm",
                active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                active && !box && "bg-primary",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
