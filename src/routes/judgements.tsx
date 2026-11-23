import { useMemo, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  FileDown,
  FileText,
  Gavel,
  Landmark,
  Scale,
} from "lucide-react";
import { PublicLayout } from "@/components/site/public-layout";
import { EmptyState, QueryError } from "@/components/common/bits";
import { FeedCard, FeedCardSkeleton } from "@/components/common/feed-card";
import { ListingToolbar, StatStrip } from "@/components/common/listing-toolbar";
import { SearchInput } from "@/components/common/search-input";
import { UliiJudgmentsPanel } from "@/components/common/ulii-panel";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { Button } from "@/components/ui/button";
import { judgementsQuery } from "@/lib/queries";
import { legalFeedQuery, JUDICIARY_LINKS, ULII_COURTS, uliiSearchUrl } from "@/lib/legal-feed/meta";
import { CAUSE_LISTS, COURT_LEVELS, type CourtLevel } from "@/lib/legal-feed/cause-lists";
import { prefetchForPage } from "@/lib/prefetch";
import { appSettingsQuery } from "@/lib/app-settings";
import { formatDate } from "@/lib/format";
import { delay, trackSpotlight } from "@/lib/motion";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/judgements")({
  head: () => ({
    meta: [
      { title: "LegalFinder | Judgements" },
      {
        name: "description",
        content:
          "Search Ugandan judgments court by court on ULII, open the Judiciary's daily cause lists for 120 courts, and follow the latest court news.",
      },
      { property: "og:title", content: "LegalFinder | Judgements" },
      {
        property: "og:description",
        content: "Judgments, cause lists and court news from official Ugandan sources.",
      },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    prefetchForPage([
      queryClient.prefetchQuery(judgementsQuery),
      queryClient.prefetchQuery(legalFeedQuery),
      queryClient.prefetchQuery(appSettingsQuery),
    ]),
  component: JudgementsPage,
});

const SORTS = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
  { id: "title", label: "A–Z" },
];
const COURTS_SHOWN = 12;

function JudgementsPage() {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const feed = useQuery(legalFeedQuery);
  const summaries = useQuery(judgementsQuery);

  const courtNews = useMemo(
    () =>
      (feed.data ?? [])
        .filter((i) => i.source === "judiciary")
        .filter((i) => !term || `${i.title} ${i.summary ?? ""}`.toLowerCase().includes(term)),
    [feed.data, term],
  );
  const latestNews = courtNews[0]?.published_at;

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
              srcSet="/images/site/lady-justice-320.avif 320w, /images/site/lady-justice-463.avif 463w"
              sizes="(min-width: 1024px) 40vw, 100vw"
            />
            <img
              src="/images/site/lady-justice-463.webp"
              srcSet="/images/site/lady-justice-320.webp 320w, /images/site/lady-justice-463.webp 463w"
              sizes="(min-width: 1024px) 40vw, 100vw"
              alt=""
              width={463}
              height={618}
              fetchPriority="high"
              className="absolute inset-y-0 right-0 -z-10 hidden h-full w-auto object-cover opacity-50 lg:block"
            />
          </picture>
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(105deg,oklch(0.16_0.035_262/0.97)_0%,oklch(0.16_0.035_262/0.9)_52%,oklch(0.16_0.035_262/0.55)_100%)]"
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-40" />
          <div
            aria-hidden
            className="animate-aurora absolute -left-16 top-8 -z-10 h-64 w-64 rounded-full bg-[oklch(0.78_0.115_80/0.16)] blur-[90px]"
          />

          <div className="grid gap-10 px-5 py-12 sm:px-8 sm:py-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-10 lg:px-10 lg:py-12 2xl:px-14 2xl:py-16">
            <div>
              <p className="animate-rise inline-flex items-center gap-2 rounded-full px-3 py-1 eyebrow text-brass surface-glass-ink">
                <Gavel className="h-3.5 w-3.5" aria-hidden /> Case law
              </p>
              <h1
                className="animate-rise mt-4 max-w-2xl text-h1 font-bold text-ink-foreground"
                style={delay(60)}
              >
                Judgements, cause lists{" "}
                <span className="font-serif italic font-medium text-brass">& court news</span>
              </h1>
              <p
                className="animate-rise mt-4 max-w-xl text-lead text-ink-foreground/75"
                style={delay(120)}
              >
                Every reported Ugandan judgment on ULII, the Judiciary&apos;s daily cause lists for{" "}
                {CAUSE_LISTS.length} courts, and the latest news from the courts — searchable in one
                place.
              </p>
              <div className="animate-rise mt-8 max-w-xl" style={delay(180)}>
                <SearchInput
                  value={q}
                  onChange={setQ}
                  tone="ink"
                  label="Search judgments, courts and court news"
                  placeholder="Search a case, a court or a topic"
                />
              </div>
              <div className="animate-rise mt-5 flex flex-wrap gap-2" style={delay(220)}>
                <Button asChild variant="brass" className="rounded-full">
                  <a href="#judgments">
                    Browse ULII <ArrowRight />
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-ink-foreground/20 bg-transparent text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground"
                >
                  <a href="#cause-lists">Cause lists</a>
                </Button>
              </div>
            </div>

            <div className="animate-rise" style={delay(260)}>
              <StatStrip
                tone="ink"
                loading={feed.isLoading}
                items={[
                  { icon: Gavel, label: "Courts on ULII", value: ULII_COURTS.length },
                  { icon: ClipboardList, label: "Cause lists", value: CAUSE_LISTS.length },
                  { icon: Landmark, label: "Court news", value: courtNews.length },
                  {
                    icon: CalendarDays,
                    label: "Latest court news",
                    value: latestNews
                      ? formatDate(latestNews, { day: "numeric", month: "short" })
                      : "—",
                  },
                ]}
              />
              <p className="mt-4 max-w-sm text-xs leading-relaxed text-ink-foreground/55">
                Links open ULII and judiciary.go.ug. LegalFinder does not copy their full texts.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page space-y-16 py-10 sm:space-y-20 sm:py-14">
        <Section
          id="judgments"
          eyebrow="Judgments"
          title="Read the full judgment, court by court"
          description="ULII, the Uganda Legal Information Institute, publishes the decisions of every superior court for free. Your search above carries over; results open on ULII."
        >
          <UliiJudgmentsPanel query={q} onQueryChange={setQ} />
        </Section>

        <CauseLists term={term} />

        <Section
          id="court-news"
          eyebrow="From the Judiciary"
          title="Court news"
          description="Headlines from judiciary.go.ug, collected every day and linked to the original."
          action={
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/news">
                All news <ArrowRight />
              </Link>
            </Button>
          }
        >
          {feed.isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <FeedCardSkeleton key={i} />
              ))}
            </div>
          ) : feed.isError ? (
            <QueryError
              message={feed.error instanceof Error ? feed.error.message : undefined}
              onRetry={() => feed.refetch()}
            />
          ) : courtNews.length === 0 ? (
            <EmptyState
              icon={<Landmark />}
              title={term ? "No court news matches" : "No court news yet"}
              description={term ? "Try another word." : "The daily collection will add it."}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {courtNews.slice(0, 6).map((item, i) => (
                <div key={item.id} className="reveal min-w-0" style={delay(i * 50)}>
                  <FeedCard item={item} />
                </div>
              ))}
            </div>
          )}
        </Section>

        <CaseSummaries term={term} query={summaries} />

        <aside className="relative isolate overflow-hidden rounded-[2rem] surface-ink p-6 shadow-float sm:p-8 lg:p-10 dark:ring-1 dark:ring-white/10">
          <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-40" />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="eyebrow text-brass">Official sources</p>
              <h2 className="mt-2 text-h3 font-bold text-ink-foreground">
                Verify every citation yourself
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-foreground/75 sm:text-base">
                Summaries on this page are a starting point. Open the judgment on ULII or the cause
                list on judiciary.go.ug before you rely on it.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="brass" className="rounded-full">
                <a href="https://ulii.org/en/judgments/" target="_blank" rel="noreferrer">
                  Open ULII <ArrowUpRight />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-ink-foreground/20 bg-transparent text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground"
              >
                <a href={JUDICIARY_LINKS.news} target="_blank" rel="noreferrer">
                  Judiciary news
                </a>
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </PublicLayout>
  );
}

function Section({
  id,
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const reveal = useReveal<HTMLElement>();
  return (
    <section ref={reveal} id={id} aria-labelledby={`${id}-title`} className="scroll-mt-28">
      <div className="reveal mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow inline-flex items-center gap-2 text-brass">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
            {eyebrow}
          </p>
          <h2 id={`${id}-title`} className="mt-2 text-h3 font-bold tracking-tight text-balance">
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="reveal" style={delay(60)}>
        {children}
      </div>
    </section>
  );
}

/* ---------------- Cause lists (links to judiciary.go.ug) ---------------- */

function CauseLists({ term }: { term: string }) {
  const [level, setLevel] = useState<"all" | CourtLevel>("all");
  const [expanded, setExpanded] = useState(false);
  const courts = CAUSE_LISTS.filter(
    (c) => (level === "all" || c.level === level) && (!term || c.name.toLowerCase().includes(term)),
  );
  const shown = expanded || term ? courts : courts.slice(0, COURTS_SHOWN);

  return (
    <Section
      id="cause-lists"
      eyebrow="Cause lists"
      title="Which cases each court is hearing"
      description="The Judiciary publishes a cause list for each court. Pick yours — it opens on judiciary.go.ug. Lists name the parties, so LegalFinder links to them instead of copying them."
    >
      <ListingToolbar
        label="Filter courts by level"
        tabs={[
          { id: "all", label: "All courts", count: CAUSE_LISTS.length },
          ...COURT_LEVELS.map((l) => ({
            id: l.id,
            label: l.label,
            count: CAUSE_LISTS.filter((c) => c.level === l.id).length,
          })),
        ]}
        tab={level}
        onTab={(id) => {
          setLevel(id as "all" | CourtLevel);
          setExpanded(false);
        }}
        resultLabel={`${courts.length} ${courts.length === 1 ? "court" : "courts"}`}
      />
      {courts.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<ClipboardList />}
            title="No court by that name"
            description="Try the town, e.g. Gulu or Mbarara."
          />
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((c, i) => (
            <li key={c.url} className="reveal min-w-0" style={delay(Math.min(i, 12) * 25)}>
              <a
                href={c.url}
                target="_blank"
                rel="noreferrer"
                onPointerMove={trackSpotlight}
                className="spotlight group flex h-full min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-xs transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-brass/40 hover:shadow-[var(--shadow-card-hover)]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-brass">
                  {c.level === "magistrate" ? (
                    <ClipboardList className="h-4 w-4" aria-hidden />
                  ) : (
                    <Landmark className="h-4 w-4" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold transition-colors group-hover:text-brass">
                    {c.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {c.level === "supreme" || c.level === "appeal"
                      ? "Daily cause list"
                      : COURT_LEVELS.find((l) => l.id === c.level)?.label}
                  </span>
                </span>
                <ArrowUpRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brass"
                  aria-hidden
                />
                <span className="sr-only"> cause list (opens judiciary.go.ug)</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {!term && courts.length > COURTS_SHOWN ? (
          <Button variant="outline" className="rounded-full" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Show fewer courts" : `Show all ${courts.length} courts`}
          </Button>
        ) : (
          <span />
        )}
        <a
          href={JUDICIARY_LINKS.news}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Source: Judiciary of Uganda, judiciary.go.ug
        </a>
      </div>
    </Section>
  );
}

/* ---------------- LegalFinder's own case summaries ---------------- */

function CaseSummaries({
  term,
  query,
}: {
  term: string;
  query: ReturnType<
    typeof useQuery<Awaited<ReturnType<NonNullable<typeof judgementsQuery.queryFn>>>>
  >;
}) {
  const { data, isLoading, isError, error, refetch } = query;
  const [court, setCourt] = useState("all");
  const [sort, setSort] = useState("newest");

  const all = useMemo(() => data ?? [], [data]);
  const courtOptions = useMemo(() => Array.from(new Set(all.map((j) => j.court))).sort(), [all]);
  const items = useMemo(() => {
    const list = all.filter((j) => {
      const text = `${j.title} ${j.case_number} ${j.court} ${j.judge ?? ""}`.toLowerCase();
      if (term && !text.includes(term)) return false;
      return court === "all" || j.court === court;
    });
    return [...list].sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : (sort === "oldest" ? 1 : -1) * (a.decided_on ?? "").localeCompare(b.decided_on ?? ""),
    );
  }, [all, term, court, sort]);
  const { page, setPage, totalPages, pageItems } = usePaginatedList(items, 6);

  if (!isLoading && !isError && all.length === 0) return null;

  return (
    <Section
      id="summaries"
      eyebrow="Case summaries"
      title="Summarised by LegalFinder"
      description="Short summaries prepared by LegalFinder. Always check the official judgment on ULII before relying on one."
    >
      <ListingToolbar
        label="Filter summaries by court"
        tabs={[
          { id: "all", label: "All", count: all.length },
          ...courtOptions.map((c) => ({
            id: c,
            label: c,
            count: all.filter((j) => j.court === c).length,
          })),
        ]}
        tab={court}
        onTab={(c) => {
          setCourt(c);
          setPage(1);
        }}
        sorts={SORTS}
        sort={sort}
        onSort={setSort}
        resultLabel={
          isLoading ? undefined : `${items.length} ${items.length === 1 ? "summary" : "summaries"}`
        }
      />
      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <FeedCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <QueryError
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState icon={<Gavel />} title="No summaries match" />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
              {pageItems.map((j, index) => (
                <article
                  key={`${sort}-${j.id}`}
                  onPointerMove={trackSpotlight}
                  className={cn(
                    "card-glow spotlight reveal relative flex min-w-0 flex-col overflow-hidden p-5 sm:p-6",
                  )}
                  style={delay(Math.min(index, 8) * 40)}
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-1 bg-[image:var(--gradient-brass)]"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[0.72rem] font-semibold text-accent-foreground">
                      <Landmark className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{j.court}</span>
                    </span>
                    {j.decided_on && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                        <time dateTime={j.decided_on}>
                          {formatDate(j.decided_on, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </time>
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-balance text-[1.0625rem] font-bold leading-snug tracking-tight sm:text-lg">
                    {j.title}
                  </h3>
                  <p className="mt-1.5 break-words font-mono text-xs text-brass">{j.case_number}</p>
                  {j.judge && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Gavel className="h-3.5 w-3.5 shrink-0" aria-hidden /> Before {j.judge}
                    </p>
                  )}
                  {j.summary && (
                    <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                      {j.summary}
                    </p>
                  )}
                  <div aria-hidden className="min-h-5 flex-1" />
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4">
                    {j.file_url ? (
                      <a
                        href={j.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="press inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        <FileDown className="h-4 w-4" aria-hidden /> Full text
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" aria-hidden /> Summary only
                      </span>
                    )}
                    <a
                      href={uliiSearchUrl(j.case_number || j.title)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-brass hover:underline"
                    >
                      <Scale className="h-4 w-4" aria-hidden /> Find on ULII
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </div>
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
    </Section>
  );
}
