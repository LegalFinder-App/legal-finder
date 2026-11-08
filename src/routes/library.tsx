import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, BookOpen, Clock, Landmark, ListChecks, ScrollText } from "lucide-react";
import { PublicLayout } from "@/components/site/public-layout";
import { LoadingRows, EmptyState, QueryError } from "@/components/common/bits";
import { SearchInput } from "@/components/common/search-input";
import { FilterChipGroup } from "@/components/common/filter-chip";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { libraryQuery } from "@/lib/queries";
import { delay } from "@/lib/motion";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Legal e-library — LegalFinder" },
      {
        name: "description",
        content: "Statutes, constitutions, practice manuals and reference texts, free to read.",
      },
      { property: "og:title", content: "Legal e-library — LegalFinder" },
      {
        property: "og:description",
        content: "Statutes, manuals and reference texts, free to read.",
      },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { data, isLoading, isError, error, refetch } = useQuery(libraryQuery);
  const [q, setQ] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const categoryOptions = useMemo(
    () => Array.from(new Set((data ?? []).map((i) => i.category))),
    [data],
  );
  const items = (data ?? []).filter((i) => {
    if (categories.length > 0 && !categories.includes(i.category)) return false;
    if (q) {
      const text = `${i.title} ${i.author ?? ""} ${i.description ?? ""}`.toLowerCase();
      if (!text.includes(q.toLowerCase())) return false;
    }
    return true;
  });
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
            className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,oklch(0.16_0.035_262/0.95)_0%,oklch(0.16_0.035_262/0.75)_45%,oklch(0.16_0.035_262/0.25)_100%)]"
          />
          <div className="px-6 py-14 sm:px-10 lg:px-14 lg:py-20">
            <p className="animate-rise eyebrow text-brass">E-library</p>
            <h1
              className="animate-rise mt-3 max-w-2xl text-h1 font-bold text-ink-foreground"
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
            <div className="animate-rise mt-8" style={delay(180)}>
              <SearchInput
                value={q}
                onChange={setQ}
                tone="ink"
                label="Search the library"
                placeholder="Search by title, author or description"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <FilterChipGroup
          options={categoryOptions}
          value={categories}
          onChange={setCategories}
          allLabel="All"
        />

        <div className="mt-10">
          {isLoading ? (
            <LoadingRows rows={5} />
          ) : isError ? (
            <QueryError
              message={error instanceof Error ? error.message : undefined}
              onRetry={() => refetch()}
            />
          ) : items.length === 0 ? (
            <EmptyState icon={<BookOpen className="h-8 w-8" />} title="Library is empty" />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                {pageItems.map((i) => {
                  const Icon = libraryIcon(i.category);
                  return (
                    <article key={i.id} className="card flex min-w-0 flex-col p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent text-brass ring-1 ring-brass/15">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                        <span className="rounded-full border border-border px-2.5 py-0.5 text-[0.7rem] font-semibold text-muted-foreground">
                          {i.category}
                        </span>
                      </div>
                      <h2 className="mt-4 text-[1.0625rem] font-bold leading-snug tracking-tight">
                        {i.title}
                      </h2>
                      {(i.author || i.year) && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {[i.author, i.year].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      {i.description && (
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                          {i.description}
                        </p>
                      )}
                      <div aria-hidden className="min-h-5 flex-1" />
                      <div className="border-t border-border pt-4">
                        {i.file_url ? (
                          <a
                            href={i.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="press inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-border bg-card text-sm font-semibold transition-colors hover:border-foreground/20 hover:bg-secondary sm:w-auto sm:px-5"
                          >
                            Read document <ArrowUpRight className="h-4 w-4" aria-hidden />
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                        ) : (
                          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" aria-hidden /> Full text coming soon
                          </p>
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
      </div>
    </PublicLayout>
  );
}

/** A recognisable icon per kind of legal text; anything else is a book. */
function libraryIcon(category: string | null | undefined) {
  const c = (category ?? "").toLowerCase();
  if (c.includes("constitution")) return Landmark;
  if (c.includes("procedure") || c.includes("rule")) return ListChecks;
  if (c.includes("statute") || c.includes("act")) return ScrollText;
  return BookOpen;
}
