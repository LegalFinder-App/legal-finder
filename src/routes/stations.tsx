import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LocateFixed, Mail, MapPin, Phone, Shield } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { LoadingRows, EmptyState, QueryError } from "@/components/common/bits";
import { SearchInput } from "@/components/common/search-input";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { Button } from "@/components/ui/button";
import { stationsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stations")({
  head: () => ({
    meta: [
      { title: "Police stations directory — LegalFinder" },
      {
        name: "description",
        content:
          "Find the nearest police station with contact details, address and district coverage.",
      },
      { property: "og:title", content: "Police stations directory — LegalFinder" },
      { property: "og:description", content: "Nearest stations with contacts and addresses." },
    ],
  }),
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

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Emergency services"
        title={
          geo.status === "granted" ? "Police stations, nearest first" : "Police stations directory"
        }
        description="Contact details for stations across the country, with direct dialling and email."
      >
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={q}
            onChange={setQ}
            label="Search stations"
            placeholder="Search station or district"
          />
          {geo.status !== "granted" && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={geo.request}
              disabled={geo.status === "locating" || geo.status === "unsupported"}
            >
              <LocateFixed className="h-4 w-4" />
              {geo.status === "locating" ? "Locating…" : "Use my location"}
            </Button>
          )}
        </div>
        {geo.status === "denied" && (
          <p className="mt-3 text-xs text-muted-foreground">
            Location access was denied — showing all stations instead.
          </p>
        )}
      </PageHeader>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
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
              {pageItems.map((s) => (
                <article key={s.id} className="card flex min-w-0 flex-col p-5 sm:p-6">
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
