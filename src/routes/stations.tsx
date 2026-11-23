import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, LocateFixed, Mail, MapPin, Phone, Shield } from "lucide-react";
import { PublicLayout } from "@/components/site/public-layout";
import { LoadingRows, EmptyState, QueryError } from "@/components/common/bits";
import { SearchInput } from "@/components/common/search-input";
import { StatStrip } from "@/components/common/listing-toolbar";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { Button } from "@/components/ui/button";
import { stationsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { delay, trackSpotlight } from "@/lib/motion";
import { useReveal } from "@/hooks/use-reveal";
import { prefetchForPage } from "@/lib/prefetch";
import { appSettingsQuery } from "@/lib/app-settings";

export const Route = createFileRoute("/stations")({
  head: () => ({
    meta: [
      { title: "LegalFinder | Police stations" },
      {
        name: "description",
        content:
          "Find the nearest police station with contact details, address and district coverage.",
      },
      { property: "og:title", content: "LegalFinder | Police stations" },
      { property: "og:description", content: "Nearest stations with contacts and addresses." },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    prefetchForPage([
      queryClient.prefetchQuery(stationsQuery),
      queryClient.prefetchQuery(appSettingsQuery),
    ]),
  component: StationsPage,
});

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function useGeolocation() {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "granted" | "denied" | "unsupported">(
    "idle",
  );

  const request = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setPosition({ lat: result.coords.latitude, lng: result.coords.longitude });
        setStatus("granted");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  return { position, status, request };
}

function StationsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery(stationsQuery);
  const [q, setQ] = useState("");
  const geo = useGeolocation();
  const listReveal = useReveal<HTMLDivElement>();

  const filtered = useMemo(
    () =>
      (data ?? []).filter((s) =>
        `${s.name} ${s.county ?? ""} ${s.address ?? ""}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [data, q],
  );

  const items = useMemo(() => {
    const position = geo.position;
    const withDistance = filtered.map((s) => ({
      ...s,
      distanceKm:
        position && s.latitude != null && s.longitude != null
          ? haversineKm(position, { lat: Number(s.latitude), lng: Number(s.longitude) })
          : null,
    }));
    if (!position) return withDistance;
    return withDistance.sort((a, b) => {
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
  }, [filtered, geo.position]);

  const { page, setPage, totalPages, pageItems } = usePaginatedList(items, 9);
  const counties = useMemo(
    () => Array.from(new Set((data ?? []).map((s) => s.county).filter(Boolean))).length,
    [data],
  );

  return (
    <PublicLayout>
      <section className="container-page pt-2">
        <div
          onPointerMove={trackSpotlight}
          className="spotlight relative isolate overflow-hidden rounded-[2rem] surface-ink shadow-float dark:ring-1 dark:ring-white/10"
        >
          <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-40" />
          <div
            aria-hidden
            className="animate-aurora absolute -right-16 top-0 -z-10 h-72 w-72 rounded-full bg-[oklch(0.78_0.115_80/0.16)] blur-[90px]"
          />
          <div className="grid gap-10 px-5 py-12 sm:px-8 sm:py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-10 lg:px-10 lg:py-12 2xl:px-14 2xl:py-16">
            <div>
              <p className="animate-rise inline-flex items-center gap-2 rounded-full px-3 py-1 eyebrow text-brass surface-glass-ink">
                <Shield className="h-3.5 w-3.5" aria-hidden /> Emergency services
              </p>
              <h1
                className="animate-rise mt-4 max-w-2xl text-h1 font-bold text-ink-foreground"
                style={delay(60)}
              >
                {geo.status === "granted" ? (
                  <>
                    Police stations,{" "}
                    <span className="font-serif italic font-medium text-brass">nearest first</span>
                  </>
                ) : (
                  <>
                    Police stations{" "}
                    <span className="font-serif italic font-medium text-brass">directory</span>
                  </>
                )}
              </h1>
              <p
                className="animate-rise mt-4 max-w-xl text-lead text-ink-foreground/75"
                style={delay(120)}
              >
                Contact details for stations across the country, with direct dialling and email.
              </p>
              <div
                className="animate-rise mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
                style={delay(180)}
              >
                <SearchInput
                  value={q}
                  onChange={(v) => {
                    setQ(v);
                    setPage(1);
                  }}
                  tone="ink"
                  label="Search stations"
                  placeholder="Search station or district"
                  className="max-w-xl"
                />
                {geo.status !== "granted" && (
                  <Button
                    type="button"
                    variant="brass"
                    size="lg"
                    className="h-13 shrink-0 rounded-full"
                    onClick={geo.request}
                    disabled={geo.status === "locating" || geo.status === "unsupported"}
                  >
                    <LocateFixed className="h-4 w-4" />
                    {geo.status === "locating" ? "Locating…" : "Use my location"}
                  </Button>
                )}
              </div>
              {geo.status === "denied" && (
                <p className="mt-3 text-xs text-ink-foreground/55">
                  Location access was denied — showing all stations instead.
                </p>
              )}
              <div className="animate-rise mt-5 flex flex-wrap gap-2" style={delay(220)}>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-ink-foreground/20 bg-transparent text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground"
                >
                  <Link to="/report">
                    Report an incident <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="animate-rise" style={delay(260)}>
              <StatStrip
                tone="ink"
                loading={isLoading}
                items={[
                  { icon: Shield, label: "Stations", value: (data ?? []).length },
                  { icon: MapPin, label: "Districts", value: counties },
                  {
                    icon: LocateFixed,
                    label: "Sorted by",
                    value: geo.status === "granted" ? "Distance" : "Name",
                  },
                ]}
              />
              <p className="mt-4 max-w-sm text-xs leading-relaxed text-ink-foreground/55">
                For emergencies, dial the station or call the national emergency line first.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div ref={listReveal} className="container-page py-10 sm:py-12">
        {isLoading ? (
          <LoadingRows rows={5} />
        ) : isError ? (
          <QueryError
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState title="No stations found" />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {pageItems.map((s, i) => (
                <article
                  key={s.id}
                  onPointerMove={trackSpotlight}
                  className="card-glow spotlight reveal flex min-w-0 flex-col p-5 sm:p-6"
                  style={delay(Math.min(i, 8) * 40)}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-info/10 text-info">
                      <Shield className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-bold leading-snug tracking-tight">{s.name}</h2>
                      {s.county && <p className="eyebrow mt-1 text-brass">{s.county}</p>}
                    </div>
                    {s.distanceKm != null && (
                      <span className="shrink-0 rounded-full bg-success/12 px-2.5 py-0.5 text-[0.7rem] font-semibold tabular-nums text-success">
                        {s.distanceKm < 1 ? "<1 km" : `${s.distanceKm.toFixed(1)} km`}
                      </span>
                    )}
                  </div>
                  {s.address && (
                    <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {s.address}
                    </p>
                  )}
                  {s.phone && (
                    <p className="mt-2 flex items-center gap-2 text-sm tabular-nums text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" aria-hidden /> {s.phone}
                    </p>
                  )}
                  <div aria-hidden className="min-h-5 flex-1" />
                  {(s.phone || s.email) && (
                    <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
                      {s.phone && (
                        <a
                          href={`tel:${s.phone}`}
                          aria-label={`Call ${s.name} on ${s.phone}`}
                          className={cn(
                            "press inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/88",
                            !s.email && "col-span-2",
                          )}
                        >
                          <Phone className="h-4 w-4" aria-hidden /> Call
                        </a>
                      )}
                      {s.email && (
                        <a
                          href={`mailto:${s.email}`}
                          aria-label={`Email ${s.name}`}
                          className={cn(
                            "press inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-semibold hover:bg-secondary",
                            !s.phone && "col-span-2",
                          )}
                        >
                          <Mail className="h-4 w-4" aria-hidden /> Email
                        </a>
                      )}
                    </div>
                  )}
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
    </PublicLayout>
  );
}
