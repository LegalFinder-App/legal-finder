import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BookOpen,
  CalendarRange,
  FileText,
  Gavel,
  Landmark,
  Library,
  ListChecks,
  Scale,
  ScrollText,
  Tags,
} from "lucide-react";
import { PublicLayout } from "@/components/site/public-layout";
import { EmptyState, QueryError } from "@/components/common/bits";
import { ListingToolbar, StatStrip } from "@/components/common/listing-toolbar";
import { SearchInput } from "@/components/common/search-input";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { libraryQuery } from "@/lib/queries";
import { JUDICIARY_LINKS, ULII_LEGISLATION_URL, uliiSearchUrl } from "@/lib/legal-feed/meta";
import { delay } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { prefetchForPage } from "@/lib/prefetch";
import { appSettingsQuery } from "@/lib/app-settings";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "LegalFinder | Library" },
      {
        name: "description",
        content: "Statutes, constitutions, practice manuals and reference texts, free to read.",
      },
      { property: "og:title", content: "LegalFinder | Library" },
      {
        property: "og:description",
        content: "Statutes, manuals and reference texts, free to read.",
      },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    prefetchForPage([
      queryClient.prefetchQuery(libraryQuery),
      queryClient.prefetchQuery(appSettingsQuery),
    ]),
  component: LibraryPage,
});

function LibraryPage() {
  const { data, isLoading, isError, error, refetch } = useQuery(libraryQuery);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("title");

  const all = useMemo(() => data ?? [], [data]);
  const categoryOptions = useMemo(
    () => Array.from(new Set(all.map((i) => i.category))).sort(),
    [all],
  );
  const years = all.map((i) => Number(i.year)).filter((y) => Number.isFinite(y) && y > 0);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = all.filter((i) => {
      if (category !== "all" && i.category !== category) return false;
      if (!term) return true;
      return `${i.title} ${i.author ?? ""} ${i.description ?? ""}`.toLowerCase().includes(term);
    });
    return [...list].sort((a, b) =>
      sort === "newest"
        ? Number(b.year ?? 0) - Number(a.year ?? 0)
        : sort === "oldest"
          ? Number(a.year ?? 9999) - Number(b.year ?? 9999)
          : a.title.localeCompare(b.title),
    );
  }, [all, q, category, sort]);
  const { page, setPage, totalPages, pageItems } = usePaginatedList(items, 9);

  return (
    <PublicLayout>
      <section className="container-page pt-2">
        <div className="relative isolate overflow-hidden rounded-[2rem] surface-ink shadow-float dark:ring-1 dark:ring-white/10">
          <picture>
            <source
              type="image/avif"
              srcSet="/images/site/library-640.avif 640w, /images/site/library-1024.avif 1024w, /images/site/library-1600.avif 1600w, /images/site/library-2400.avif 2400w"
              sizes="(min-width: 1280px) 1216px, 100vw"
            />
            <img
              src="/images/site/library-1600.webp"
              srcSet="/images/site/library-640.webp 640w, /images/site/library-1024.webp 1024w, /images/site/library-1600.webp 1600w, /images/site/library-2400.webp 2400w"
              sizes="(min-width: 1280px) 1216px, 100vw"
              alt=""
              width={1600}
              height={1067}
              fetchPriority="high"
              className="absolute inset-0 -z-10 h-full w-full object-cover opacity-45"
            />
          </picture>
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,oklch(0.16_0.035_262/0.95)_0%,oklch(0.16_0.035_262/0.78)_50%,oklch(0.16_0.035_262/0.3)_100%)]"
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-40" />
          <div className="px-5 py-12 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
            <p className="animate-rise inline-flex items-center gap-2 rounded-full px-3 py-1 eyebrow text-brass surface-glass-ink">
              <BookOpen className="h-3.5 w-3.5" aria-hidden /> E-library
            </p>
            <h1
              className="animate-rise mt-4 max-w-2xl text-h1 font-bold text-ink-foreground"
              style={delay(60)}
            >
              The texts every case starts from
            </h1>
            <p
              className="animate-rise mt-4 max-w-xl text-lead text-ink-foreground/75"
              style={delay(120)}
            >
              Constitutions, statutes, procedure rules and practice manuals — collected, tagged and
              free to read.
            </p>
            <div className="animate-rise mt-8 max-w-xl" style={delay(180)}>
              <SearchInput
                value={q}
                onChange={(v) => {
                  setQ(v);
                  setPage(1);
                }}
                tone="ink"
                label="Search the library"
                placeholder="Search by title, author or description"
              />
            </div>
            <div className="animate-rise mt-6 max-w-2xl" style={delay(240)}>
              <StatStrip
                tone="ink"
                loading={isLoading}
                items={[
                  { icon: Library, label: "Documents", value: all.length },
                  { icon: Tags, label: "Categories", value: categoryOptions.length },
                  {
                    icon: CalendarRange,
                    label: "Years covered",
                    value: years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "—",
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="container-page py-10 sm:py-12">
        <ListingToolbar
          label="Filter by category"
          tabs={[
            { id: "all", label: "All", count: all.length },
            ...categoryOptions.map((c) => ({
              id: c,
              label: c,
              count: all.filter((i) => i.category === c).length,
            })),
          ]}
          tab={category}
          onTab={(c) => {
            setCategory(c);
            setPage(1);
          }}
          sorts={[
            { id: "title", label: "A–Z" },
            { id: "newest", label: "Newest first" },
            { id: "oldest", label: "Oldest first" },
          ]}
          sort={sort}
          onSort={setSort}
          resultLabel={
            isLoading
              ? undefined
              : `${items.length} ${items.length === 1 ? "document" : "documents"}`
          }
        />

        <div className="mt-6">
          {isLoading ? (
            <div
              className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4 sm:gap-5"
              role="status"
              aria-label="Loading the library"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card h-60 p-6" aria-hidden>
                  <div className="h-11 w-11 animate-pulse rounded-2xl bg-muted" />
                  <div className="mt-5 h-4 w-3/4 animate-pulse rounded-full bg-muted" />
                  <div className="mt-3 h-3 w-1/2 animate-pulse rounded-full bg-muted/70" />
                  <div className="mt-6 h-3 w-full animate-pulse rounded-full bg-muted/70" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <QueryError
              message={error instanceof Error ? error.message : undefined}
              onRetry={() => refetch()}
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<BookOpen />}
              title={all.length === 0 ? "The library is empty" : "No documents match"}
              description={all.length === 0 ? undefined : "Try another word or category."}
            />
          ) : (
            <>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4 sm:gap-5">
                {pageItems.map((i, index) => {
                  const kind = libraryKind(i.category);
                  return (
                    <article
                      key={`${category}-${sort}-${i.id}`}
                      className="animate-rise card group relative flex min-w-0 flex-col overflow-hidden p-5 sm:p-6"
                      style={delay(Math.min(index, 8) * 40)}
                    >
                      <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1", kind.bar)} />
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={cn(
                            "grid h-11 w-11 shrink-0 place-items-center rounded-2xl ring-1",
                            kind.tile,
                          )}
                        >
                          <kind.icon className="h-5 w-5" aria-hidden />
                        </span>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="rounded-full border border-border px-2.5 py-0.5 text-[0.7rem] font-semibold text-muted-foreground">
                            {i.category}
                          </span>
                          {i.year && (
                            <span className="text-xs font-bold tabular-nums text-muted-foreground">
                              {i.year}
                            </span>
                          )}
                        </div>
                      </div>
                      <h2 className="mt-4 text-[1.0625rem] font-bold leading-snug tracking-tight">
                        {i.title}
                      </h2>
                      {i.author && <p className="mt-1 text-sm text-muted-foreground">{i.author}</p>}
                      {i.description && (
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                          {i.description}
                        </p>
                      )}
                      <div aria-hidden className="min-h-5 flex-1" />
                      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                        {i.file_url ? (
                          <a
                            href={i.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="press inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                          >
                            Read document <ArrowUpRight className="h-4 w-4" aria-hidden />
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                        ) : (
                          <a
                            href={uliiSearchUrl(i.title)}
                            target="_blank"
                            rel="noreferrer"
                            className="press inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                          >
                            Official text <ArrowUpRight className="h-4 w-4" aria-hidden />
                            <span className="sr-only"> on ULII (opens in a new tab)</span>
                          </a>
                        )}
                        {i.file_url ? (
                          <a
                            href={uliiSearchUrl(i.title)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-brass hover:underline"
                          >
                            <Scale className="h-3.5 w-3.5" aria-hidden /> On ULII
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                        ) : (
                          <span className={cn("text-xs font-semibold", kind.text)}>
                            {kind.label}
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
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

        <OfficialCollections />
      </div>
    </PublicLayout>
  );
}

const COLLECTIONS = [
  {
    icon: ScrollText,
    title: "Laws of Uganda",
    body: "Acts, statutory instruments and the Constitution, as published by ULII.",
    href: ULII_LEGISLATION_URL,
    source: "ulii.org",
  },
  {
    icon: Gavel,
    title: "Court judgments",
    body: "Decisions of the Supreme Court, Court of Appeal and High Court.",
    href: "/judgements",
    source: "LegalFinder",
  },
  {
    icon: FileText,
    title: "Court forms",
    body: "Official forms for filing in Uganda's courts, from the Judiciary.",
    href: JUDICIARY_LINKS.courtForms,
    source: "judiciary.go.ug",
  },
] as const;

/** Where the official texts live: links out, nothing copied (docs/SOURCES.md). */
function OfficialCollections() {
  return (
    <section aria-labelledby="collections-title" className="mt-16 sm:mt-20">
      <p className="eyebrow text-brass">Official sources</p>
      <h2 id="collections-title" className="mt-2 text-h3 font-bold tracking-tight">
        Go straight to the official collections
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        The authoritative texts are published by ULII and the Judiciary of Uganda. These open their
        own pages.
      </p>
      <ul className="mt-6 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
        {COLLECTIONS.map((c) => {
          const external = c.href.startsWith("http");
          return (
            <li key={c.title} className="min-w-0">
              <a
                href={c.href}
                {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                className="card card-interactive group relative flex h-full flex-col overflow-hidden p-5 sm:p-6"
              >
                <span
                  aria-hidden
                  className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[oklch(0.78_0.115_80/0.12)] blur-2xl"
                />
                <span className="grid h-11 w-11 place-items-center rounded-2xl surface-ink">
                  <c.icon className="h-5 w-5 text-brass" aria-hidden />
                </span>
                <span className="mt-4 block text-lg font-bold tracking-tight group-hover:text-brass">
                  {c.title}
                </span>
                <span className="mt-1.5 block flex-1 text-sm leading-relaxed text-muted-foreground">
                  {c.body}
                </span>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brass">
                  {c.source}
                  <ArrowUpRight
                    className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
                {external && <span className="sr-only"> (opens in a new tab)</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Colour and icon per kind of legal text, so a list of documents scans at a glance. */
function libraryKind(category: string | null | undefined) {
  const c = (category ?? "").toLowerCase();
  if (c.includes("constitution"))
    return {
      icon: Landmark,
      label: "Constitutional",
      bar: "bg-[linear-gradient(90deg,var(--success),transparent)]",
      tile: "bg-success/10 text-success ring-success/20",
      text: "text-success",
    };
  if (c.includes("procedure") || c.includes("rule"))
    return {
      icon: ListChecks,
      label: "Procedure",
      bar: "bg-[linear-gradient(90deg,var(--info),transparent)]",
      tile: "bg-info/10 text-info ring-info/20",
      text: "text-info",
    };
  if (c.includes("statute") || c.includes("act"))
    return {
      icon: ScrollText,
      label: "Legislation",
      bar: "bg-[image:var(--gradient-brass)]",
      tile: "bg-accent text-brass ring-brass/15",
      text: "text-brass",
    };
  return {
    icon: BookOpen,
    label: "Reference",
    bar: "bg-[linear-gradient(90deg,var(--muted-foreground),transparent)]",
    tile: "bg-secondary text-muted-foreground ring-border",
    text: "text-muted-foreground",
  };
}
