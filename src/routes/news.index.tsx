import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Landmark, Newspaper, Radio, Shield } from "lucide-react";
import { ArticleCard, ArticleCardSkeleton } from "@/components/common/article-card";
import { FeedCard, FeedCardSkeleton } from "@/components/common/feed-card";
import { PublicLayout } from "@/components/site/public-layout";
import { EmptyState, QueryError } from "@/components/common/bits";
import { ListingToolbar, StatStrip } from "@/components/common/listing-toolbar";
import { SearchInput } from "@/components/common/search-input";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { Button } from "@/components/ui/button";
import { newsListQuery } from "@/lib/queries";
import { legalFeedQuery, type LegalFeedItem } from "@/lib/legal-feed/meta";
import { prefetchForPage } from "@/lib/prefetch";
import { appSettingsQuery } from "@/lib/app-settings";
import { formatDate } from "@/lib/format";
import { delay, trackSpotlight } from "@/lib/motion";
import { useReveal } from "@/hooks/use-reveal";

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
  const listReveal = useReveal<HTMLDivElement>();

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
              className="absolute inset-0 -z-10 h-full w-full object-cover object-[center_30%] opacity-35"
            />
          </picture>
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,oklch(0.16_0.035_262/0.96)_0%,oklch(0.16_0.035_262/0.82)_50%,oklch(0.16_0.035_262/0.38)_100%)]"
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-40" />
          <div
            aria-hidden
            className="animate-aurora absolute -left-20 top-0 -z-10 h-72 w-72 rounded-full bg-[oklch(0.78_0.115_80/0.16)] blur-[90px]"
          />

          <div className="grid gap-10 px-5 py-12 sm:px-8 sm:py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-10 lg:px-10 lg:py-12 2xl:px-14 2xl:py-16">
            <div>
              <p className="animate-rise inline-flex items-center gap-2 rounded-full px-3 py-1 eyebrow text-brass surface-glass-ink">
                <Newspaper className="h-3.5 w-3.5" aria-hidden /> Newsroom
              </p>
              <h1
                className="animate-rise mt-4 max-w-2xl text-h1 font-bold text-ink-foreground"
                style={delay(60)}
              >
                What&apos;s changing{" "}
                <span className="font-serif italic font-medium text-brass">in the law</span>
              </h1>
              <p
                className="animate-rise mt-4 max-w-xl text-lead text-ink-foreground/75"
                style={delay(120)}
              >
                Official headlines from the Judiciary of Uganda and the Uganda Police Force,
                collected every day and linked to the original — alongside LegalFinder&apos;s own
                explainers.
              </p>
              <div className="animate-rise mt-8 max-w-xl" style={delay(180)}>
                <SearchInput
                  value={q}
                  onChange={(v) => {
                    setQ(v);
                    setPage(1);
                  }}
                  tone="ink"
                  label="Search news"
                  placeholder="Search headlines and summaries"
                />
              </div>
              <div className="animate-rise mt-5 flex flex-wrap gap-2" style={delay(220)}>
                <Button asChild variant="brass" className="rounded-full">
                  <a href="#news-feed">
                    Browse headlines <ArrowRight />
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-ink-foreground/20 bg-transparent text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground"
                >
                  <Link to="/updates">Live updates feed</Link>
                </Button>
              </div>
            </div>

            <div className="animate-rise" style={delay(260)}>
              <StatStrip
                tone="ink"
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
              <p className="mt-4 max-w-sm text-xs leading-relaxed text-ink-foreground/55">
                Official sources first. LegalFinder explainers are marked separately in the filter.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div id="news-feed" className="container-page scroll-mt-28 py-10 sm:py-12">
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

        <div ref={listReveal} className="mt-6">
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
                {pageItems.map((e, i) => (
                  <div
                    key={`${sort}-${e.id}`}
                    className="reveal min-w-0"
                    style={delay(Math.min(i, 8) * 45)}
                  >
                    {e.kind === "feed" ? (
                      <FeedCard item={e.item} />
                    ) : (
                      <ArticleCard article={e.post} kind="news" />
                    )}
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

        <Link
          to="/updates"
          onPointerMove={trackSpotlight}
          className="card-glow spotlight group mt-10 flex items-center gap-4 p-4 sm:p-5"
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
