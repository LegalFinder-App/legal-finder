import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, ArrowUpRight, Coins, MapPin, Shield } from "lucide-react";
import { PublicLayout } from "@/components/site/public-layout";
import { LoadingRows, EmptyState, QueryError } from "@/components/common/bits";
import { StatStrip } from "@/components/common/listing-toolbar";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { Button } from "@/components/ui/button";
import { wantedQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { delay, trackSpotlight } from "@/lib/motion";
import { useReveal } from "@/hooks/use-reveal";
import { appSettingsQuery } from "@/lib/app-settings";
import { prefetchForPage } from "@/lib/prefetch";
import { formatNumber } from "@/lib/format";

export const Route = createFileRoute("/wanted")({
  head: () => ({
    meta: [
      { title: "LegalFinder | Public notices" },
      {
        name: "description",
        content:
          "Official public notices published by police services, including persons of interest.",
      },
      { property: "og:title", content: "LegalFinder | Public notices" },
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
  const listReveal = useReveal<HTMLDivElement>();
  const highRisk = items.filter((p) => p.danger_level === "high").length;

  const hero = (
    <section className="container-page pt-2">
      <div
        onPointerMove={trackSpotlight}
        className="spotlight relative isolate overflow-hidden rounded-[2rem] surface-ink shadow-float dark:ring-1 dark:ring-white/10"
      >
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-40" />
        <div
          aria-hidden
          className="animate-aurora absolute -left-16 top-8 -z-10 h-64 w-64 rounded-full bg-[oklch(0.78_0.115_80/0.14)] blur-[90px]"
        />
        <div className="grid gap-10 px-5 py-12 sm:px-8 sm:py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-10 lg:px-10 lg:py-12 2xl:px-14 2xl:py-16">
          <div>
            <p className="animate-rise inline-flex items-center gap-2 rounded-full px-3 py-1 eyebrow text-brass surface-glass-ink">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Public notices
            </p>
            <h1
              className="animate-rise mt-4 max-w-2xl text-h1 font-bold text-ink-foreground"
              style={delay(60)}
            >
              Persons of <span className="font-serif italic font-medium text-brass">interest</span>
            </h1>
            <p
              className="animate-rise mt-4 max-w-xl text-lead text-ink-foreground/75"
              style={delay(120)}
            >
              Published by authorised police officers. If you recognise anyone listed here, contact
              your nearest station — do not approach.
            </p>
            <div className="animate-rise mt-8 flex flex-wrap gap-2" style={delay(180)}>
              <Button asChild variant="brass" className="rounded-full">
                <Link to="/stations">
                  Find a station <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-ink-foreground/20 bg-transparent text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground"
              >
                <Link to="/report">Report a sighting</Link>
              </Button>
            </div>
          </div>
          <div className="animate-rise" style={delay(240)}>
            <StatStrip
              tone="ink"
              loading={isLoading}
              items={[
                { icon: Shield, label: "Active notices", value: items.length },
                { icon: AlertTriangle, label: "High risk", value: highRisk },
              ]}
            />
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-ink-foreground/55">
              Information only. Approaching a listed person yourself can put you and others at risk.
            </p>
          </div>
        </div>
      </div>
    </section>
  );

  if (settings.data && !settings.data.wanted_notices_enabled) {
    return (
      <PublicLayout>
        {hero}
        <div className="container-page py-14">
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
      {hero}
      <div ref={listReveal} className="container-page py-10 sm:py-12">
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
              {pageItems.map((p, i) => (
                <Link
                  key={p.id}
                  to="/wanted/$id"
                  params={{ id: p.id }}
                  onPointerMove={trackSpotlight}
                  className="card-glow spotlight reveal group flex min-w-0 flex-col overflow-hidden"
                  style={delay(Math.min(i, 8) * 40)}
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
                          UGX {formatNumber(p.reward)}
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
