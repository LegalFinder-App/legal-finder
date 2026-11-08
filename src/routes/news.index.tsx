import { createFileRoute } from "@tanstack/react-router";
import { ArticleCard } from "@/components/common/article-card";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { LoadingRows, EmptyState, QueryError } from "@/components/common/bits";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { newsListQuery } from "@/lib/queries";

export const Route = createFileRoute("/news/")({
  head: () => ({
    meta: [
      { title: "Legal news — LegalFinder" },
      {
        name: "description",
        content:
          "Court rulings, legislative changes and justice-sector news that affect your rights.",
      },
      { property: "og:title", content: "Legal news — LegalFinder" },
      { property: "og:description", content: "Rulings, legislation and justice-sector news." },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery(newsListQuery);
  const [lead, ...rest] = data ?? [];
  const { page, setPage, totalPages, pageItems } = usePaginatedList(rest, 6);

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Newsroom"
        title="What's changing in the law"
        description="Court rulings, new statutes and justice-sector developments, summarised."
      />
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        {isLoading ? (
          <LoadingRows rows={5} />
        ) : isError ? (
          <QueryError
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
          />
        ) : !lead ? (
          <EmptyState title="No news published yet" />
        ) : (
          <>
            <ArticleCard article={lead} kind="news" variant="feature" />

            {rest.length > 0 && (
              <>
                <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                  {pageItems.map((n) => (
                    <ArticleCard key={n.id} article={n} kind="news" />
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
          </>
        )}
      </div>
    </PublicLayout>
  );
}
