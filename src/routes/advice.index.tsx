import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  CalendarDays,
  Landmark,
  Lightbulb,
  Shield,
  Tags,
} from "lucide-react";
import { ArticleCard, ArticleCardSkeleton } from "@/components/common/article-card";
import { FeedCard, FeedCardSkeleton } from "@/components/common/feed-card";
import { Button } from "@/components/ui/button";
import { JUDICIARY_LINKS, safetyAdvisoriesQuery } from "@/lib/legal-feed/meta";
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
      queryClient.prefetchQuery(safetyAdvisoriesQuery),
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

        <SafetyAdvisories />
        <KnowYourRights />
      </div>
    </PublicLayout>
  );
}

/** Uganda Police public-safety and road advisories, collected daily (docs/SOURCES.md). */
function SafetyAdvisories() {
  const { data, isLoading, isError } = useQuery(safetyAdvisoriesQuery);
  if (isError || (!isLoading && (data ?? []).length === 0)) return null;
  return (
    <section aria-labelledby="advisories-title" className="mt-16 sm:mt-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow inline-flex items-center gap-1.5 text-brass">
            <Shield className="h-3.5 w-3.5" aria-hidden /> From the Uganda Police Force
          </p>
          <h2 id="advisories-title" className="mt-2 text-h3 font-bold tracking-tight">
            Safety and road advisories
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Official public-safety and traffic notices from upf.go.ug, collected every day and
            linked to the original.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0 self-start rounded-full sm:self-auto">
          <Link to="/updates">
            All police updates <ArrowRight />
          </Link>
        </Button>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <FeedCardSkeleton key={i} />)
          : (data ?? []).slice(0, 6).map((item) => <FeedCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}

const RIGHTS_LINKS = [
  {
    title: "Know your rights",
    body: "The Judiciary's own guide to your rights in court, bail and legal representation.",
    href: JUDICIARY_LINKS.knowYourRights,
  },
  {
    title: "Court FAQs",
    body: "Answers from the Judiciary on filing, fees, cause lists and following a case.",
    href: JUDICIARY_LINKS.faqs,
  },
] as const;

function KnowYourRights() {
  return (
    <section
      aria-labelledby="rights-title"
      className="relative isolate mt-16 overflow-hidden rounded-[2rem] surface-ink p-6 shadow-float sm:mt-20 sm:p-10 dark:ring-1 dark:ring-white/10"
    >
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-50" />
      <div
        aria-hidden
        className="animate-aurora absolute -right-24 -top-24 -z-10 h-72 w-72 rounded-full bg-[oklch(0.78_0.115_80/0.2)] blur-[90px]"
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div>
          <p className="eyebrow inline-flex items-center gap-1.5 text-brass">
            <Landmark className="h-3.5 w-3.5" aria-hidden /> From the Judiciary of Uganda
          </p>
          <h2 id="rights-title" className="mt-2 text-h3 font-bold text-ink-foreground">
            Straight from the courts
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-foreground/75 sm:text-base">
            Official guidance from the Judiciary, alongside our plain-language guides. Both open on
            judiciary.go.ug.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {RIGHTS_LINKS.map((l) => (
            <li key={l.title} className="min-w-0">
              <a
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="group flex h-full flex-col rounded-2xl p-5 transition-colors surface-glass-ink hover:bg-white/10"
              >
                <span className="flex items-center justify-between gap-3 font-bold text-ink-foreground">
                  {l.title}
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 text-brass transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
                <span className="mt-1.5 text-sm leading-relaxed text-ink-foreground/70">
                  {l.body}
                </span>
                <span className="sr-only"> (opens judiciary.go.ug in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
