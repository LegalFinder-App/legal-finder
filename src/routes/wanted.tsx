import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowUpRight, Coins, MapPin } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { LoadingRows, EmptyState, QueryError } from "@/components/common/bits";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { wantedQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { appSettingsQuery } from "@/lib/app-settings";
import { prefetchForPage } from "@/lib/prefetch";

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
  loader: ({ context: { queryClient } }) =>
    prefetchForPage([
      queryClient.prefetchQuery(wantedQuery),
      queryClient.prefetchQuery(appSettingsQuery),
    ]),
  component: WantedPage,
});

const RISK_ON_PHOTO: Record<string, string> = {
  high: "bg-[oklch(0.5_0.19_25)] text-white",
  medium: "bg-[oklch(0.82_0.14_80)] text-[oklch(0.25_0.06_60)]",
  low: "bg-white text-[oklch(0.25_0.04_262)]",
};

function WantedPage() {
  const { data, isLoading, isError, error, refetch } = useQuery(wantedQuery);
  const settings = useQuery(appSettingsQuery);
  const items = data ?? [];
  const { page, setPage, totalPages, pageItems } = usePaginatedList(items, 9);

  if (settings.data && !settings.data.wanted_notices_enabled) {
    return (
      <PublicLayout>
        <PageHeader eyebrow="Public notices" title="Persons of interest" />
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <EmptyState
            icon={<AlertTriangle className="h-8 w-8" />}
            title="Public notices are temporarily unavailable"
            description="This feature has been paused by an administrator."
          />
        </div>
      </PublicLayout>
    );
  }

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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {pageItems.map((p) => (
                <Link
                  key={p.id}
                  to="/wanted/$id"
                  params={{ id: p.id }}
                  className="group card card-interactive flex min-w-0 flex-col overflow-hidden"
                >
                  <div className="card-media aspect-4/3">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name} loading="lazy" decoding="async" />
                    ) : (
                      <div className="grid h-full place-items-center text-muted-foreground">
                        <AlertTriangle className="h-8 w-8" aria-hidden />
                      </div>
                    )}
                    {/* Solid colours: tinted badges disappear against a photo. */}
                    <span
                      className={cn(
                        "absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-bold capitalize shadow-xs",
                        RISK_ON_PHOTO[p.danger_level] ?? RISK_ON_PHOTO.low,
                      )}
                    >
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                      {p.danger_level} risk
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="text-[1.0625rem] font-bold leading-snug tracking-tight transition-colors group-hover:text-brass">
                      {p.name}
                    </h2>
                    {p.alias && <p className="text-sm text-muted-foreground">a.k.a. {p.alias}</p>}
                    {p.offence && <p className="mt-3 text-sm font-medium">{p.offence}</p>}
                    {p.description && (
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                    <div aria-hidden className="min-h-4 flex-1" />
                    <div className="flex items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="truncate">
                          {p.last_seen ? `Last seen: ${p.last_seen}` : "Location unknown"}
                        </span>
                      </span>
                      {p.reward ? (
                        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-brass">
                          <Coins className="h-3.5 w-3.5" aria-hidden />
                          UGX {p.reward.toLocaleString()}
                        </span>
                      ) : (
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-foreground" aria-hidden />
                      )}
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
