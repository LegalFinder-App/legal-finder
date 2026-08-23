import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone, Mail, Search } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { LoadingRows, EmptyState } from "@/components/common/bits";
import { stationsQuery } from "@/lib/queries";

export const Route = createFileRoute("/stations")({
  head: () => ({
    meta: [
      { title: "Police stations directory — LegalFinder" },
      {
        name: "description",
        content:
          "Find the nearest police station with contact details, address and county coverage.",
      },
      { property: "og:title", content: "Police stations directory — LegalFinder" },
      { property: "og:description", content: "Nearest stations with contacts and addresses." },
    ],
  }),
  component: StationsPage,
});

function StationsPage() {
  const { data, isLoading } = useQuery(stationsQuery);
  const [q, setQ] = useState("");
  const items = (data ?? []).filter((s) =>
    `${s.name} ${s.county ?? ""} ${s.address ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Emergency services"
        title="Police stations near you"
        description="Contact details for stations across the country, with direct dialling and email."
      >
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-foreground/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search station or county"
            className="h-12 w-full rounded-md border border-ink-foreground/20 bg-ink-foreground/5 pl-10 pr-4 text-sm text-ink-foreground placeholder:text-ink-foreground/40 focus:border-brass focus:outline-none"
          />
        </div>
      </PageHeader>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        {isLoading ? (
          <LoadingRows rows={5} />
        ) : items.length === 0 ? (
          <EmptyState title="No stations found" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((s) => (
              <div key={s.id} className="rounded-lg border border-border bg-card p-6 shadow-plate">
                <h2 className="font-display text-lg font-semibold">{s.name}</h2>
                {s.county && <p className="eyebrow mt-1 text-brass">{s.county}</p>}
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {s.address && (
                    <p className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brass" /> {s.address}
                    </p>
                  )}
                  {s.phone && (
                    <a href={`tel:${s.phone}`} className="flex items-center gap-2 hover:text-brass">
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
        )}
      </div>
    </PublicLayout>
  );
}
