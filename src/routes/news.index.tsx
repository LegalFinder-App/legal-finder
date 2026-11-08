import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Newspaper, Radio, Rss } from "lucide-react";
import { ArticleCard, ArticleCardSkeleton } from "@/components/common/article-card";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { EmptyState, QueryError } from "@/components/common/bits";
import { ListingToolbar, StatStrip } from "@/components/common/listing-toolbar";
import { SearchInput } from "@/components/common/search-input";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { newsListQuery } from "@/lib/queries";
import { prefetchForPage } from "@/lib/prefetch";
import { appSettingsQuery } from "@/lib/app-settings";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/news/")({
  head: () => ({
    meta: [
      { title: "LegalFinder | News" },
      {
        name: "description",
        content:
          "Court rulings, legislative changes and justice-sector news that affect your rights.",
      },
      { property: "og:title", content: "LegalFinder | News" },
      { property: "og:description", content: "Rulings, legislation and justice-sector news." },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    prefetchForPage([
      queryClient.prefetchQuery(newsListQuery),
      queryClient.prefetchQuery(appSettingsQuery),
    ]),
  component: NewsPage,
});

const SORTS = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
];

function NewsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery(newsListQuery);
  const [q, setQ] = useState("");
  const [source, setSource] = useState("all");
  const [sort, setSort] = useState("newest");

  const all = useMemo(() => data ?? [], [data]);
  const sources = useMemo(
    () => Array.from(new Set(all.map((n) => n.source).filter((s): s is string => !!s))).sort(),
    [all],
  );
  const latest = all[0]?.published_at;

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = all.filter((n) => {
      if (source !== "all" && n.source !== source) return false;
      if (!term) return true;
      return `${n.title} ${n.summary ?? ""} ${n.source ?? ""}`.toLowerCase().includes(term);
    });
    return sort === "oldest" ? [...list].reverse() : list;
  }, [all, q, source, sort]);

  // The lead story is only featured on the default view; a filtered list stays a plain grid.
  const featured = !q.trim() && source === "all" && sort === "newest";
  const lead = featured ? items[0] : undefined;
  const rest = featured ? items.slice(1) : items;
  const { page, setPage, totalPages, pageItems } = usePaginatedList(rest, 9);

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Newsroom"
        title="What's changing in the law"
        description="Court rulings, new statutes and justice-sector developments, summarised."
      >
        <SearchInput
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          label="Search news"
          placeholder="Search headlines and summaries"
        />
        <div className="mt-6 max-w-3xl">
          <StatStrip
            loading={isLoading}
            items={[
              { icon: Newspaper, label: "Stories", value: all.length },
              { icon: Rss, label: "Sources", value: Math.max(sources.length, all.length ? 1 : 0) },
              {
                icon: CalendarDays,
                label: "Latest story",
                value: latest ? formatDate(latest, { day: "numeric", month: "short" }) : "—",
              },
            ]}
          />
        </div>
      </PageHeader>

      <div className="container-page py-10 sm:py-12">
        <Link
          to="/updates"
          className="card card-interactive group mb-6 flex items-center gap-4 p-4 sm:p-5"
        >
          <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl surface-ink">
            <Radio className="h-5 w-5 text-brass" aria-hidden />
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-success"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold leading-snug tracking-tight">
              Live from the Judiciary and Uganda Police
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Official headlines, collected daily from their own websites and linked to the source.
            </span>
          </span>
          <ArrowRight
            className="h-4 w-4 shrink-0 text-brass transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>

        <ListingToolbar
          label="Filter by source"
          tabs={[
            { id: "all", label: "All", count: all.length },
            ...sources.map((s) => ({
              id: s,
              label: s,
              count: all.filter((n) => n.source === s).length,
            })),
          ]}
          tab={source}
          onTab={(s) => {
            setSource(s);
            setPage(1);
          }}
          sorts={SORTS}
          sort={sort}
          onSort={(s) => {
            setSort(s);
            setPage(1);
          }}
          resultLabel={
            isLoading ? undefined : `${items.length} ${items.length === 1 ? "story" : "stories"}`
          }
        />

        <div className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4 sm:gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <ArticleCardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <QueryError
              message={error instanceof Error ? error.message : undefined}
              onRetry={() => refetch()}
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Newspaper />}
              title={all.length === 0 ? "No news published yet" : "No stories match"}
              description={all.length === 0 ? undefined : "Try another word or source."}
            />
          ) : (
            <>
              {lead && page === 1 && <ArticleCard article={lead} kind="news" variant="feature" />}
              {rest.length > 0 && (
                <>
                  <div
                    className={
                      "grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4 sm:gap-5" +
                      (lead && page === 1 ? " mt-6 sm:mt-8" : "")
                    }
                  >
                    {pageItems.map((n) => (
                      <ArticleCard key={`${sort}-${n.id}`} article={n} kind="news" />
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
            </>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
