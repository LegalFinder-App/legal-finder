import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { LoadingRows, EmptyState, QueryError } from "@/components/common/bits";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { Badge } from "@/components/ui/badge";
import { wantedQuery } from "@/lib/queries";

export const Route = createFileRoute("/wanted")({
  head: () => ({
    meta: [
      { title: "Public notices & wanted persons — LegalFinder" },
      {
        name: "description",
        content:
          "Official public notices published by police services, including persons of interest.",
      },
      { property: "og:title", content: "Public notices — LegalFinder" },
      { property: "og:description", content: "Official notices published by police services." },
    ],
  }),
  component: WantedPage,
});

const TONE: Record<string, "destructive" | "warning" | "muted"> = {
  high: "destructive",
  medium: "warning",
  low: "muted",
};

function WantedPage() {
  const { data, isLoading, isError, error, refetch } = useQuery(wantedQuery);
  const items = data ?? [];
  const { page, setPage, totalPages, pageItems } = usePaginatedList(items, 9);

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Public notices"
        title="Persons of interest"
        description="Published by authorised police officers. If you recognise anyone listed here, contact your nearest station — do not approach."
      />
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        {isLoading ? (
          <LoadingRows rows={4} />
        ) : isError ? (
          <QueryError
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState icon={<AlertTriangle className="h-8 w-8" />} title="No active notices" />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {pageItems.map((p) => (
                <Link
                  key={p.id}
                  to="/wanted/$id"
                  params={{ id: p.id }}
                  className="group overflow-hidden rounded-lg border border-border bg-card shadow-plate transition-all hover:-translate-y-0.5 hover:shadow-raised"
                >
                  <div className="aspect-4/3 bg-secondary">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-muted-foreground">
                        <AlertTriangle className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-display text-lg font-semibold group-hover:text-brass">
                        {p.name}
                      </h2>
                      <Badge variant={TONE[p.danger_level] ?? "muted"}>{p.danger_level} risk</Badge>
                    </div>
                    {p.alias && <p className="text-sm text-muted-foreground">a.k.a. {p.alias}</p>}
                    {p.offence && <p className="mt-3 text-sm font-medium">{p.offence}</p>}
                    {p.description && (
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                      <span>{p.last_seen ? `Last seen: ${p.last_seen}` : "Location unknown"}</span>
                      {p.reward ? (
                        <span className="font-mono text-brass">
                          UGX {p.reward.toLocaleString()}
                        </span>
                      ) : null}
                    </div>
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
    </PublicLayout>
  );
}
