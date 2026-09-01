import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, MapPin, ShieldAlert } from "lucide-react";
import { PublicLayout } from "@/components/site/public-layout";
import { EmptyState } from "@/components/common/bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { wantedPersonQuery } from "@/lib/queries";

export const Route = createFileRoute("/wanted/$id")({
  head: () => ({
    meta: [
      { title: "Public notice — LegalFinder" },
      { name: "description", content: "Official public notice published by police services." },
      { property: "og:title", content: "Public notice — LegalFinder" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WantedDetail,
});

const TONE: Record<string, "destructive" | "warning" | "muted"> = {
  high: "destructive",
  medium: "warning",
  low: "muted",
};

function WantedDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery(wantedPersonQuery(id));

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-3xl px-4 py-24">
          <div className="h-96 animate-pulse rounded-xl bg-muted" />
        </div>
      </PublicLayout>
    );
  }

  if (!data) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-2xl px-4 py-28">
          <EmptyState
            title="Notice not found"
            description="This notice may have been resolved or removed."
            action={
              <Button asChild variant="brass">
                <Link to="/wanted">Back to notices</Link>
              </Button>
            }
          />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
        <Link
          to="/wanted"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brass"
        >
          <ArrowLeft className="h-4 w-4" /> Public notices
        </Link>

        <div className="mt-8 grid gap-8 sm:grid-cols-[220px_1fr]">
          <div className="aspect-square overflow-hidden rounded-xl border border-border bg-secondary shadow-plate">
            {data.photo_url ? (
              <img src={data.photo_url} alt={data.name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-muted-foreground">
                <AlertTriangle className="h-10 w-10" />
              </div>
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-3xl font-semibold">{data.name}</h1>
              <Badge variant={TONE[data.danger_level] ?? "muted"}>{data.danger_level} risk</Badge>
            </div>
            {data.alias && <p className="mt-1 text-muted-foreground">a.k.a. {data.alias}</p>}
            {data.offence && <p className="mt-4 text-base font-medium">{data.offence}</p>}
            {data.last_seen && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-brass" /> Last seen: {data.last_seen}
              </p>
            )}
            {data.reward ? (
              <p className="mt-2 font-mono text-sm text-brass">
                Reward: UGX {data.reward.toLocaleString()}
              </p>
            ) : null}
          </div>
        </div>

        {data.description && (
          <p className="mt-8 leading-relaxed text-foreground/90">{data.description}</p>
        )}

        <div className="mt-10 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-display font-semibold">Do not approach</p>
              <p className="mt-1 text-sm text-muted-foreground">
                If you recognise this person, contact your nearest police station or file a sighting
                report — do not attempt to intervene yourself.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="brass" size="sm">
                  <Link to="/report" search={{ subject: data.name }}>
                    Report a sighting
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/stations">Find a nearby station</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </article>
    </PublicLayout>
  );
}
