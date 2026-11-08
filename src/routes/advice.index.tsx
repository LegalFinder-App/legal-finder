import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpenCheck, CalendarDays, Lightbulb, Tags } from "lucide-react";
import { ArticleCard, ArticleCardSkeleton } from "@/components/common/article-card";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { EmptyState, QueryError } from "@/components/common/bits";
import { ListingToolbar, StatStrip } from "@/components/common/listing-toolbar";
import { SearchInput } from "@/components/common/search-input";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { adviceListQuery } from "@/lib/queries";
import { prefetchForPage } from "@/lib/prefetch";
import { appSettingsQuery } from "@/lib/app-settings";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/advice/")({
  head: () => ({
    meta: [
      { title: "LegalFinder | Legal advice" },
      {
        name: "description",
        content:
          "Plain-language guides on tenancy, employment, family law, land, criminal procedure and your rights.",
      },
      { property: "og:title", content: "LegalFinder | Legal advice" },
      {
        property: "og:description",
        content: "Plain-language guides on your everyday legal rights.",
      },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    prefetchForPage([
      queryClient.prefetchQuery(adviceListQuery),
      queryClient.prefetchQuery(appSettingsQuery),
    ]),
  component: AdvicePage,
});

const SORTS = [
  { id: "newest", label: "Newest first" },
  { id: "title", label: "A–Z" },
];

function AdvicePage() {
  const { data, isLoading, isError, error, refetch } = useQuery(adviceListQuery);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");

  const all = useMemo(() => data ?? [], [data]);
  const categoryOptions = useMemo(
    () => Array.from(new Set(all.map((a) => a.category))).sort(),
    [all],
  );
  const latest = all
    .map((a) => a.updated_at ?? a.created_at)
    .sort()
    .at(-1);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = all.filter((a) => {
      if (category !== "all" && a.category !== category) return false;
      if (!term) return true;
      return `${a.title} ${a.summary ?? ""} ${a.category}`.toLowerCase().includes(term);
    });
    return sort === "title" ? [...list].sort((a, b) => a.title.localeCompare(b.title)) : list;
  }, [all, q, category, sort]);
  const { page, setPage, totalPages, pageItems } = usePaginatedList(items, 9);

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Guides"
        title="Legal advice, in plain language"
        description="Written and reviewed by practising advocates so you know your options before you spend a shilling."
      >
        <SearchInput
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          label="Search guides"
          placeholder="Search tenancy, land, employment…"
        />
        <div className="mt-6 max-w-3xl">
          <StatStrip
            loading={isLoading}
            items={[
              { icon: BookOpenCheck, label: "Guides", value: all.length },
              { icon: Tags, label: "Topics", value: categoryOptions.length },
              {
                icon: CalendarDays,
                label: "Last updated",
                value: latest ? formatDate(latest, { day: "numeric", month: "short" }) : "—",
              },
            ]}
          />
        </div>
      </PageHeader>

      <div className="container-page py-10 sm:py-12">
        <ListingToolbar
          label="Filter by topic"
          tabs={[
            { id: "all", label: "All", count: all.length },
            ...categoryOptions.map((c) => ({
              id: c,
              label: c,
              count: all.filter((a) => a.category === c).length,
            })),
          ]}
          tab={category}
          onTab={(c) => {
            setCategory(c);
            setPage(1);
          }}
          sorts={SORTS}
          sort={sort}
          onSort={(s) => {
            setSort(s);
            setPage(1);
          }}
          resultLabel={
            isLoading ? undefined : `${items.length} ${items.length === 1 ? "guide" : "guides"}`
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
              icon={<Lightbulb />}
              title={all.length === 0 ? "Nothing published yet" : "No guides match"}
              description={all.length === 0 ? undefined : "Try another word or topic."}
            />
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4 sm:gap-5">
                {pageItems.map((a) => (
                  <ArticleCard key={`${sort}-${a.id}`} article={a} kind="advice" />
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
    </PublicLayout>
  );
}
