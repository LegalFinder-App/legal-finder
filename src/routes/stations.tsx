import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LocateFixed, Mail, MapPin, Phone } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { LoadingRows, EmptyState, QueryError } from "@/components/common/bits";
import { SearchInput } from "@/components/common/search-input";
import { PaginationBar, usePaginatedList } from "@/components/common/paginated-list";
import { Button } from "@/components/ui/button";
import { stationsQuery } from "@/lib/queries";

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
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {pageItems.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-border bg-card p-6 shadow-plate"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-lg font-semibold">{s.name}</h2>
                    {s.distanceKm != null && (
                      <span className="shrink-0 rounded-full bg-brass/15 px-2 py-0.5 font-mono text-[0.65rem] text-brass">
                        {s.distanceKm < 1 ? "<1 km" : `${s.distanceKm.toFixed(1)} km`}
                      </span>
                    )}
                  </div>
                  {s.county && <p className="eyebrow mt-1 text-brass">{s.county}</p>}
                  <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {s.address && (
                      <p className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brass" /> {s.address}
                      </p>
                    )}
                    {s.phone && (
                      <a
                        href={`tel:${s.phone}`}
                        className="flex items-center gap-2 hover:text-brass"
                      >
                        <Phone className="h-4 w-4 text-brass" /> {s.phone}
                      </a>
                    )}
                    {s.email && (
                      <a
                        href={`mailto:${s.email}`}
                        className="flex items-center gap-2 hover:text-brass"
                      >
                        <Mail className="h-4 w-4 text-brass" /> {s.email}
                      </a>
                    )}
                  </div>
                </div>
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
