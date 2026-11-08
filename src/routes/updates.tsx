import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BookOpenText,
  CalendarDays,
  Flag,
  Gavel,
  Landmark,
  Newspaper,
  Search,
  Shield,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { EmptyState, QueryError } from "@/components/common/bits";
import { SearchInput } from "@/components/common/search-input";
import { FilterChipGroup } from "@/components/common/filter-chip";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { Button } from "@/components/ui/button";
import {
  legalFeedQuery,
  reportConcernHref,
  SOURCE_META,
  ULII_ATTRIBUTION,
  ULII_COURTS,
  uliiCourtUrl,
  uliiSearchUrl,
  type LegalFeedItem,
} from "@/lib/legal-feed/meta";
import { prefetchForPage } from "@/lib/prefetch";
import { appSettingsQuery } from "@/lib/app-settings";
import { formatDate } from "@/lib/format";
import { delay } from "@/lib/motion";
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

  const filtered = items.filter((i) => {
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
  const { page, setPage, totalPages, pageItems } = usePaginatedList(filtered, 12);

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Legal updates"
        title="Courts and police, in one feed"
        description="Headlines from the Judiciary of Uganda and the Uganda Police Force, summarised and linked to the original. Judgments open on ULII, Uganda's free law library."
      >
        <SearchInput
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          label="Search legal updates"
          placeholder="Search headlines, e.g. traffic, Supreme Court, bail"
        />
      </PageHeader>

      <div className="container-page grid gap-8 py-10 sm:py-12 lg:grid-cols-[1fr_20rem] lg:gap-10">
        <div className="min-w-0">
          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Choose a feed"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => {
                  setTab(t.id);
                  setPage(1);
                }}
                className={cn(
                  "press inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold",
                  tab === t.id
                    ? "border-primary bg-primary text-primary-foreground shadow-xs"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <t.icon className="h-4 w-4" aria-hidden />
                {t.label}
              </button>
            ))}
          </div>

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
              <JudgmentsPanel initialQuery={q} />
            ) : isLoading ? (
              <div className="grid gap-4" role="status" aria-label="Loading updates">
                {Array.from({ length: 4 }).map((_, i) => (
                  <UpdateSkeleton key={i} />
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
                <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
                  {filtered.length} {filtered.length === 1 ? "update" : "updates"}
                </p>
                <ol className="grid gap-4">
                  {pageItems.map((item, i) => (
                    <li
                      key={`${tab}-${page}-${item.id}`}
                      className="animate-rise"
                      style={delay(Math.min(i, 6) * 50)}
                    >
                      <UpdateCard item={item} />
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
          <section className="card p-5">
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
                      className="font-semibold hover:text-brass"
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
          </section>

          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <ShieldCheck className="h-4 w-4 text-success" aria-hidden /> Privacy and accuracy
            </h2>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              We show headlines and a short extract only, and always link to the original. Details
              about children and victims of sexual offences are never shown. LegalFinder is
              independent and not affiliated with these institutions.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Spotted a problem? Use{" "}
              <span className="font-semibold text-foreground">Report a concern</span> on any update
              and we'll review it promptly.
            </p>
          </section>
        </aside>
      </div>
    </PublicLayout>
  );
}

function UpdateCard({ item }: { item: LegalFeedItem }) {
  const meta = SOURCE_META[item.source];
  const SourceIcon = item.source === "judiciary" ? Landmark : Shield;
  return (
    <article className="card group relative p-5 transition-[box-shadow,border-color] duration-300 hover:border-foreground/15 hover:shadow-[var(--shadow-card-hover)] sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-semibold",
            item.source === "judiciary"
              ? "bg-accent text-accent-foreground"
              : "bg-info/10 text-info",
          )}
        >
          <SourceIcon className="h-3.5 w-3.5" aria-hidden />
          {meta.short}
        </span>
        {item.category && (
          <span className="rounded-full border border-border px-2.5 py-0.5 text-[0.72rem] font-medium text-muted-foreground">
            {item.category}
          </span>
        )}
        {item.published_at && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            <time dateTime={item.published_at}>{formatDate(item.published_at)}</time>
          </span>
        )}
      </div>

      <h3 className="mt-3 text-[1.0625rem] font-bold leading-snug tracking-tight sm:text-lg">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="transition-colors after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] group-hover:text-brass"
        >
          {item.title}
          <span className="sr-only"> (opens {meta.host} in a new tab)</span>
        </a>
      </h3>

      {item.summary ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
      ) : item.summary_withheld ? (
        <p className="mt-2 text-sm italic leading-relaxed text-muted-foreground">
          Summary withheld to protect the people involved — read the official statement.
        </p>
      ) : null}

      <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold hover:text-brass"
        >
          Read on {meta.host}
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </a>
        <a
          href={reportConcernHref(item)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Flag className="h-3.5 w-3.5" aria-hidden /> Report a concern
        </a>
      </div>
    </article>
  );
}

function UpdateSkeleton() {
  return (
    <div className="card p-5 sm:p-6" aria-hidden>
      <div className="flex gap-2">
        <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
        <div className="h-6 w-28 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mt-4 h-5 w-4/5 animate-pulse rounded-full bg-muted" />
      <div className="mt-3 h-3.5 w-full animate-pulse rounded-full bg-muted/70" />
      <div className="mt-2 h-3.5 w-2/3 animate-pulse rounded-full bg-muted/70" />
      <div className="mt-5 h-9 w-40 animate-pulse rounded-full bg-muted" />
    </div>
  );
}

function JudgmentsPanel({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const search = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) window.open(uliiSearchUrl(query), "_blank", "noopener,noreferrer");
  };
  return (
    <div className="space-y-5">
      <section className="card overflow-hidden">
        <div className="relative isolate surface-ink p-6 sm:p-8">
          <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-50" />
          <p className="eyebrow text-brass">Court judgments</p>
          <h2 className="mt-2 text-h4 font-bold text-ink-foreground">
            Read judgments on ULII, Uganda's free law library
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-foreground/75">
            Search reported decisions from every superior court. Results open on ULII in a new tab.
          </p>
          <form onSubmit={search} className="mt-5 flex flex-col gap-2 sm:flex-row" role="search">
            <label htmlFor="ulii-q" className="sr-only">
              Search judgments on ULII
            </label>
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-foreground/50"
                aria-hidden
              />
              <input
                id="ulii-q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. land title, bail, election petition"
                className="h-12 w-full rounded-full border pl-11 pr-4 text-base text-ink-foreground placeholder:text-ink-foreground/50 surface-glass-ink focus:border-brass focus:outline-none focus:ring-[3px] focus:ring-brass/25 sm:text-sm"
              />
            </div>
            <Button type="submit" variant="brass" size="lg" className="h-12">
              Search ULII <ArrowUpRight />
            </Button>
          </form>
        </div>
      </section>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ULII_COURTS.map((c, i) => (
          <li key={c.code} className="animate-rise" style={delay(i * 50)}>
            <a
              href={uliiCourtUrl(c.code)}
              target="_blank"
              rel="noreferrer"
              className="card card-interactive group flex h-full items-center gap-4 p-4"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent text-brass">
                <Gavel className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold tracking-tight group-hover:text-brass">
                  {c.name}
                </span>
                <span className="block text-xs text-muted-foreground">{c.note}</span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brass">
                View on ULII <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {ULII_ATTRIBUTION}. Links open ULII's own pages; LegalFinder does not copy ULII content.
      </p>
    </div>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
