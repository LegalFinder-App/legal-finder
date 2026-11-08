import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Landmark, Newspaper, Radio, Shield } from "lucide-react";
import { ArticleCard, ArticleCardSkeleton } from "@/components/common/article-card";
import { FeedCard, FeedCardSkeleton } from "@/components/common/feed-card";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { EmptyState, QueryError } from "@/components/common/bits";
import { ListingToolbar, StatStrip } from "@/components/common/listing-toolbar";
import { SearchInput } from "@/components/common/search-input";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { newsListQuery } from "@/lib/queries";
import { legalFeedQuery, type LegalFeedItem } from "@/lib/legal-feed/meta";
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
          "Official headlines from the Judiciary of Uganda and the Uganda Police Force, collected daily, with LegalFinder's own explainers.",
      },
      { property: "og:title", content: "LegalFinder | News" },
      {
        property: "og:description",
        content: "Court and police headlines from official Ugandan sources, updated daily.",
      },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    prefetchForPage([
      queryClient.prefetchQuery(newsListQuery),
      queryClient.prefetchQuery(legalFeedQuery),
      queryClient.prefetchQuery(appSettingsQuery),
    ]),
  component: NewsPage,
});

type Post = NonNullable<Awaited<ReturnType<NonNullable<typeof newsListQuery.queryFn>>>>[number];
type Entry =
  | { kind: "feed"; id: string; date: string; text: string; item: LegalFeedItem }
  | { kind: "post"; id: string; date: string; text: string; post: Post };
type Tab = "all" | "judiciary" | "upf" | "legalfinder";

const SORTS = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
];

function NewsPage() {
  const feed = useQuery(legalFeedQuery);
  const posts = useQuery(newsListQuery);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState("newest");

  const entries = useMemo<Entry[]>(() => {
    const fromFeed: Entry[] = (feed.data ?? []).map((item) => ({
      kind: "feed",
      id: `f-${item.id}`,
      date: item.published_at ?? item.last_seen_at,
      text: `${item.title} ${item.summary ?? ""} ${item.category ?? ""}`,
      item,
    }));
    const fromPosts: Entry[] = (posts.data ?? []).map((post) => ({
      kind: "post",
      id: `p-${post.id}`,
      date: post.published_at,
      text: `${post.title} ${post.summary ?? ""} ${post.source ?? ""}`,
      post,
    }));
    return [...fromFeed, ...fromPosts].sort((a, b) => b.date.localeCompare(a.date));
  }, [feed.data, posts.data]);

  const count = (t: Tab) => entries.filter((e) => matchesTab(e, t)).length;
  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = entries.filter(
      (e) => matchesTab(e, tab) && (!term || e.text.toLowerCase().includes(term)),
    );
    return sort === "oldest" ? [...list].reverse() : list;
  }, [entries, q, tab, sort]);
  const { page, setPage, totalPages, pageItems } = usePaginatedList(items, 12);

  const isLoading = feed.isLoading || posts.isLoading;
  const isError = feed.isError && posts.isError;
  const latest = entries[0]?.date;

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Newsroom"
        title="What's changing in the law"
        description="Official headlines from the Judiciary of Uganda and the Uganda Police Force, collected every day and linked to the original — alongside LegalFinder's own explainers."
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
              { icon: Landmark, label: "From the courts", value: count("judiciary") },
              { icon: Shield, label: "From the police", value: count("upf") },
              {
                icon: CalendarDays,
                label: "Latest headline",
                value: latest ? formatDate(latest, { day: "numeric", month: "short" }) : "—",
              },
            ]}
          />
        </div>
      </PageHeader>

      <div className="container-page py-10 sm:py-12">
        <ListingToolbar
          label="Filter by source"
          tabs={[
            { id: "all", label: "All", count: entries.length },
            { id: "judiciary", label: "Courts", count: count("judiciary") },
            { id: "upf", label: "Police", count: count("upf") },
            { id: "legalfinder", label: "LegalFinder", count: count("legalfinder") },
          ]}
          tab={tab}
          onTab={(t) => {
            setTab(t as Tab);
            setPage(1);
          }}
          sorts={SORTS}
          sort={sort}
          onSort={(s) => {
            setSort(s);
            setPage(1);
          }}
          resultLabel={
            isLoading
              ? undefined
              : `${items.length} ${items.length === 1 ? "headline" : "headlines"}`
          }
        />

        <div className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-4 sm:gap-5">
              {Array.from({ length: 6 }).map((_, i) =>
                i % 3 === 2 ? <ArticleCardSkeleton key={i} /> : <FeedCardSkeleton key={i} />,
              )}
            </div>
          ) : isError ? (
            <QueryError
              message={feed.error instanceof Error ? feed.error.message : undefined}
              onRetry={() => {
                void feed.refetch();
                void posts.refetch();
              }}
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Newspaper />}
              title={entries.length === 0 ? "No headlines yet" : "No headlines match"}
              description={entries.length === 0 ? undefined : "Try another word or source."}
            />
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,19rem),1fr))] gap-4 sm:gap-5">
                {pageItems.map((e) =>
                  e.kind === "feed" ? (
                    <FeedCard key={`${sort}-${e.id}`} item={e.item} />
                  ) : (
                    <ArticleCard key={`${sort}-${e.id}`} article={e.post} kind="news" />
                  ),
                )}
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

        <Link
          to="/updates"
          className="card card-interactive group mt-10 flex items-center gap-4 p-4 sm:p-5"
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
              Follow the live courts and police feed
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Filter police headlines by category and search judgments on ULII.
            </span>
          </span>
          <ArrowRight
            className="h-4 w-4 shrink-0 text-brass transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </PublicLayout>
  );
}

function matchesTab(e: Entry, tab: Tab) {
  if (tab === "all") return true;
  if (tab === "legalfinder") return e.kind === "post";
  return e.kind === "feed" && e.item.source === tab;
}
