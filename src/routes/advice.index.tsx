import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { LoadingRows, EmptyState, QueryError } from "@/components/common/bits";
import { FilterChipGroup } from "@/components/common/filter-chip";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { adviceListQuery } from "@/lib/queries";

export const Route = createFileRoute("/advice/")({
  head: () => ({
    meta: [
      { title: "Legal advice & guides — LegalFinder" },
      {
        name: "description",
        content:
          "Plain-language guides on tenancy, employment, family law, land, criminal procedure and your rights.",
      },
      { property: "og:title", content: "Legal advice & guides — LegalFinder" },
      {
        property: "og:description",
        content: "Plain-language guides on your everyday legal rights.",
      },
    ],
  }),
  component: AdvicePage,
});

function AdvicePage() {
  const { data, isLoading, isError, error, refetch } = useQuery(adviceListQuery);
  const [categories, setCategories] = useState<string[]>([]);
  const categoryOptions = useMemo(
    () => Array.from(new Set((data ?? []).map((a) => a.category))),
    [data],
  );
  const items = (data ?? []).filter(
    (a) => categories.length === 0 || categories.includes(a.category),
  );
  const { page, setPage, totalPages, pageItems } = usePaginatedList(items, 9);

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Guides"
        title="Legal advice, in plain language"
        description="Written and reviewed by practising advocates so you know your options before you spend a shilling."
      />
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
            <EmptyState title="Nothing published yet" />
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pageItems.map((a) => (
                  <Link
                    key={a.id}
                    to="/advice/$slug"
                    params={{ slug: a.slug ?? a.id }}
                    className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-plate transition-all hover:-translate-y-0.5 hover:shadow-raised"
                  >
                    {a.image_url && (
                      <img
                        src={a.image_url}
                        alt=""
                        loading="lazy"
                        className="h-40 w-full object-cover"
                      />
                    )}
                    <div className="flex flex-1 flex-col p-5">
                      <p className="eyebrow text-brass">{a.category}</p>
                      <h2 className="mt-2 font-display text-lg font-semibold leading-snug group-hover:text-brass">
                        {a.title}
                      </h2>
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{a.summary}</p>
                      <p className="mt-auto pt-4 text-xs text-muted-foreground">
                        {a.author_name ?? "LegalFinder editorial"}
                      </p>
                    </div>
                  </Link>
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
