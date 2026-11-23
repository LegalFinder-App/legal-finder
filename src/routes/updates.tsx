import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  Clock,
  Gavel,
  Landmark,
  Newspaper,
  Shield,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { PublicLayout } from "@/components/site/public-layout";
import { EmptyState, QueryError } from "@/components/common/bits";
import { SearchInput } from "@/components/common/search-input";
import { ListingToolbar, StatStrip } from "@/components/common/listing-toolbar";
import { FilterChipGroup } from "@/components/common/filter-chip";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { FeedCard, FeedCardSkeleton } from "@/components/common/feed-card";
import { UliiJudgmentsPanel } from "@/components/common/ulii-panel";
import { Button } from "@/components/ui/button";
import { legalFeedQuery, SOURCE_META } from "@/lib/legal-feed/meta";
import { prefetchForPage } from "@/lib/prefetch";
import { appSettingsQuery } from "@/lib/app-settings";
import { formatDate } from "@/lib/format";
import { delay, trackSpotlight } from "@/lib/motion";
import { useReveal } from "@/hooks/use-reveal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/updates")({
  head: () => ({
    meta: [
      { title: "LegalFinder | Updates" },
      {
        name: "description",
        content:
          "Headlines from the Judiciary of Uganda and the Uganda Police Force in one feed, with links to the originals and to judgments on ULII.",
      },
      { property: "og:title", content: "LegalFinder | Updates" },
      {
        property: "og:description",
        content: "Court and police news from official Ugandan sources, in one feed.",
      },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    prefetchForPage([
      queryClient.prefetchQuery(legalFeedQuery),
      queryClient.prefetchQuery(appSettingsQuery),
    ]),
  component: UpdatesPage,
});

const SORTS = [
  { id: "newest", label: "Newest first" },
  { id: "oldest", label: "Oldest first" },
];

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "all", label: "All", icon: Newspaper },
  { id: "judiciary", label: "Courts", icon: Landmark },
  { id: "upf", label: "Police", icon: Shield },
  { id: "judgments", label: "Judgments", icon: Gavel },
];
type Tab = "all" | "judiciary" | "upf" | "judgments";

function UpdatesPage() {
  const { data, isLoading, isError, error, refetch } = useQuery(legalFeedQuery);
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [sort, setSort] = useState("newest");
  const listReveal = useReveal<HTMLDivElement>();

  const items = useMemo(() => data ?? [], [data]);
  const lastSync = useMemo(
    () =>
      items.reduce<string | null>(
        (max, i) => (!max || i.last_seen_at > max ? i.last_seen_at : max),
        null,
      ),
    [items],
  );
  const policeCategories = useMemo(
    () =>
      Array.from(
        new Set(items.filter((i) => i.source === "upf").map((i) => i.category ?? "News")),
      ).sort(),
    [items],
  );

  const count = (source?: "judiciary" | "upf") =>
    source ? items.filter((i) => i.source === source).length : items.length;
  const advisories = items.filter(
    (i) => i.category === "Public safety" || i.category === "Traffic alert",
  ).length;

  const matching = items.filter((i) => {
    if (tab === "judiciary" || tab === "upf") {
      if (i.source !== tab) return false;
    }
    if (tab === "upf" && categories.length > 0 && !categories.includes(i.category ?? "News")) {
      return false;
    }
    if (q) {
      const text = `${i.title} ${i.summary ?? ""} ${i.category ?? ""}`.toLowerCase();
      if (!text.includes(q.toLowerCase())) return false;
    }
    return true;
  });
  const filtered = sort === "oldest" ? [...matching].reverse() : matching;
  const { page, setPage, totalPages, pageItems } = usePaginatedList(filtered, 12);

  const jumpTab = (next: Tab) => {
    setTab(next);
    setPage(1);
    document.getElementById("updates-feed")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
              className="absolute inset-0 -z-10 h-full w-full object-cover opacity-35"
            />
          </picture>
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(115deg,oklch(0.16_0.035_262/0.96)_0%,oklch(0.16_0.035_262/0.84)_55%,oklch(0.16_0.035_262/0.4)_100%)]"
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-40" />
          <div
            aria-hidden
            className="animate-aurora absolute -right-16 bottom-0 -z-10 h-72 w-72 rounded-full bg-[oklch(0.78_0.115_80/0.16)] blur-[90px]"
          />

          <div className="grid gap-10 px-5 py-12 sm:px-8 sm:py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-10 lg:px-10 lg:py-12 2xl:px-14 2xl:py-16">
            <div>
              <p className="animate-rise inline-flex items-center gap-2 rounded-full px-3 py-1 eyebrow text-brass surface-glass-ink">
                <Newspaper className="h-3.5 w-3.5" aria-hidden /> Legal updates
              </p>
              <h1
                className="animate-rise mt-4 max-w-2xl text-h1 font-bold text-ink-foreground"
                style={delay(60)}
              >
                Courts and police,{" "}
                <span className="font-serif italic font-medium text-brass">in one feed</span>
              </h1>
              <p
                className="animate-rise mt-4 max-w-xl text-lead text-ink-foreground/75"
                style={delay(120)}
              >
                Headlines from the Judiciary of Uganda and the Uganda Police Force, summarised and
                linked to the original. Judgments open on ULII, Uganda&apos;s free law library.
              </p>
              <div className="animate-rise mt-8 max-w-xl" style={delay(180)}>
                <SearchInput
                  value={q}
                  onChange={(v) => {
                    setQ(v);
                    setPage(1);
                  }}
                  tone="ink"
                  label="Search legal updates"
                  placeholder="Search headlines, e.g. traffic, Supreme Court, bail"
                />
              </div>
              <div className="animate-rise mt-5 flex flex-wrap gap-2" style={delay(220)}>
                <Button
                  type="button"
                  variant="brass"
                  className="rounded-full"
                  onClick={() => jumpTab("all")}
                >
                  View feed <ArrowRight />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-ink-foreground/20 bg-transparent text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground"
                  onClick={() => jumpTab("judgments")}
                >
                  Search ULII
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
                  { icon: ShieldCheck, label: "Safety advisories", value: advisories },
                  {
                    icon: Clock,
                    label: "Last checked",
                    value: lastSync
                      ? formatDate(lastSync, { day: "numeric", month: "short" })
                      : "—",
                  },
                ]}
              />
              <p className="mt-4 max-w-sm text-xs leading-relaxed text-ink-foreground/55">
                Headlines and short extracts only — always open the original on judiciary.go.ug or
                upf.go.ug.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div
        id="updates-feed"
        className="container-page grid scroll-mt-28 gap-8 py-10 sm:py-12 lg:grid-cols-[1fr_20rem] lg:gap-10"
      >
        <div ref={listReveal} className="min-w-0">
          <ListingToolbar
            label="Choose a feed"
            tabs={TABS.map((t) => ({
              id: t.id,
              label: t.label,
              count:
                t.id === "all"
                  ? count()
                  : t.id === "judgments"
                    ? undefined
                    : count(t.id as "judiciary" | "upf"),
            }))}
            tab={tab}
            onTab={(t) => {
              setTab(t as Tab);
              setPage(1);
            }}
            sorts={tab === "judgments" ? undefined : SORTS}
            sort={sort}
            onSort={(v) => {
              setSort(v);
              setPage(1);
            }}
            resultLabel={
              tab === "judgments" || isLoading
                ? undefined
                : `${filtered.length} ${filtered.length === 1 ? "update" : "updates"}`
            }
          />

          {tab === "upf" && policeCategories.length > 1 && (
            <FilterChipGroup
              className="mt-5"
              options={policeCategories}
              value={categories}
              onChange={(v) => {
                setCategories(v);
                setPage(1);
              }}
              multiple
              allLabel="All police updates"
            />
          )}

          <div className="mt-6">
            {tab === "judgments" ? (
              <div className="reveal">
                <UliiJudgmentsPanel query={q} onQueryChange={setQ} />
              </div>
            ) : isLoading ? (
              <div
                className="grid gap-4 sm:gap-5 xl:grid-cols-2"
                role="status"
                aria-label="Loading updates"
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <FeedCardSkeleton key={i} />
                ))}
              </div>
            ) : isError ? (
              <QueryError
                message={error instanceof Error ? error.message : undefined}
                onRetry={() => refetch()}
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<Newspaper />}
                title={
                  items.length === 0
                    ? "The first sync hasn't run yet"
                    : "Nothing matches that search"
                }
                description={
                  items.length === 0
                    ? "Updates from the courts and police appear here after the daily sync."
                    : "Try another word, or switch to All."
                }
              />
            ) : (
              <>
                <ol className="grid gap-4 sm:gap-5 xl:grid-cols-2">
                  {pageItems.map((item, i) => (
                    <li
                      key={`${tab}-${sort}-${page}-${item.id}`}
                      className="reveal min-w-0"
                      style={delay(Math.min(i, 6) * 50)}
                    >
                      <FeedCard item={item} />
                    </li>
                  ))}
                </ol>
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

        <aside className="space-y-4 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:self-start">
          <section onPointerMove={trackSpotlight} className="card-glow spotlight p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <BookOpenText className="h-4 w-4 text-brass" aria-hidden /> About this feed
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              {(["judiciary", "upf"] as const).map((s) => (
                <li key={s} className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-brass">
                    {s === "judiciary" ? (
                      <Landmark className="h-4 w-4" aria-hidden />
                    ) : (
                      <Shield className="h-4 w-4" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0">
                    <a
                      href={SOURCE_META[s].home}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold transition-colors hover:text-brass"
                    >
                      {SOURCE_META[s].name}
                    </a>
                    <span className="block text-xs text-muted-foreground">
                      {plural(items.filter((i) => i.source === s).length, "update")} ·{" "}
                      {SOURCE_META[s].host}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {lastSync && (
              <p className="mt-4 rounded-xl bg-secondary/70 px-3 py-2 text-xs text-muted-foreground">
                Last checked{" "}
                {formatDate(lastSync, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                (Kampala time). Checked daily.
              </p>
            )}
            <div className="mt-4 flex flex-col gap-2">
              <Button asChild variant="outline" size="sm" className="justify-between rounded-full">
                <Link to="/judgements">
                  Judgements hub <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-between rounded-full">
                <Link to="/news">
                  Newsroom <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </section>

          <section
            className={cn(
              "relative isolate overflow-hidden rounded-[1.25rem] surface-ink p-5 shadow-float sm:p-6 dark:ring-1 dark:ring-white/10",
            )}
          >
            <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-40" />
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink-foreground">
              <ShieldCheck className="h-4 w-4 text-brass" aria-hidden /> Privacy and accuracy
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-ink-foreground/70">
              We show headlines and a short extract only, and always link to the original. Details
              about children and victims of sexual offences are never shown. LegalFinder is
              independent and not affiliated with these institutions.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-ink-foreground/70">
              Spotted a problem? Use{" "}
              <span className="font-semibold text-ink-foreground">Report a concern</span> on any
              update and we&apos;ll review it promptly.
            </p>
            <a
              href={SOURCE_META.judiciary.home}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brass hover:underline"
            >
              judiciary.go.ug <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          </section>
        </aside>
      </div>
    </PublicLayout>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
