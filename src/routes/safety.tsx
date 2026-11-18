import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Shield, ShieldCheck } from "lucide-react";
import { PublicLayout } from "@/components/site/public-layout";
import { LoadingRows, EmptyState, QueryError } from "@/components/common/bits";
import { StatStrip } from "@/components/common/listing-toolbar";
import { Button } from "@/components/ui/button";
import { securityTipsQuery } from "@/lib/queries";
import { delay, trackSpotlight } from "@/lib/motion";
import { useReveal } from "@/hooks/use-reveal";
import { prefetchForPage } from "@/lib/prefetch";
import { appSettingsQuery } from "@/lib/app-settings";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "LegalFinder | Safety" },
      {
        name: "description",
        content:
          "Practical safety guidance: what to do during an arrest, how to protect evidence, and how to stay safe.",
      },
      { property: "og:title", content: "LegalFinder | Safety" },
      {
        property: "og:description",
        content: "Practical guidance for staying safe and protecting your rights.",
      },
    ],
  }),
  loader: ({ context: { queryClient } }) =>
    prefetchForPage([
      queryClient.prefetchQuery(securityTipsQuery),
      queryClient.prefetchQuery(appSettingsQuery),
    ]),
  component: SafetyPage,
});

function SafetyPage() {
  const { data, isLoading, isError, error, refetch } = useQuery(securityTipsQuery);
  const listReveal = useReveal<HTMLDivElement>();
  const tips = data ?? [];

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
            className="animate-aurora absolute -right-16 bottom-0 -z-10 h-72 w-72 rounded-full bg-[oklch(0.78_0.115_80/0.16)] blur-[90px]"
          />
          <div className="grid gap-10 px-5 py-12 sm:px-10 sm:py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-12 lg:px-14 lg:py-16">
            <div>
              <p className="animate-rise inline-flex items-center gap-2 rounded-full px-3 py-1 eyebrow text-brass surface-glass-ink">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Stay safe
              </p>
              <h1
                className="animate-rise mt-4 max-w-2xl text-h1 font-bold text-ink-foreground"
                style={delay(60)}
              >
                Safety & security{" "}
                <span className="font-serif italic font-medium text-brass">guidance</span>
              </h1>
              <p
                className="animate-rise mt-4 max-w-xl text-lead text-ink-foreground/75"
                style={delay(120)}
              >
                Short, practical steps for the moments that matter most.
              </p>
              <div className="animate-rise mt-8 flex flex-wrap gap-2" style={delay(180)}>
                <Button asChild variant="brass" className="rounded-full">
                  <Link to="/advice">
                    Plain-language guides <ArrowRight />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-ink-foreground/20 bg-transparent text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground"
                >
                  <Link to="/stations">Find a station</Link>
                </Button>
              </div>
            </div>
            <div className="animate-rise" style={delay(240)}>
              <StatStrip
                tone="ink"
                loading={isLoading}
                items={[
                  { icon: ShieldCheck, label: "Tips", value: tips.length },
                  { icon: Shield, label: "Focus", value: "Practical steps" },
                ]}
              />
              <p className="mt-4 max-w-sm text-xs leading-relaxed text-ink-foreground/55">
                General guidance only — not a substitute for advice from a verified advocate on your
                facts.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div ref={listReveal} className="container-page py-10 sm:py-12">
        {isLoading ? (
          <LoadingRows rows={4} />
        ) : isError ? (
          <QueryError
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
          />
        ) : tips.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="h-8 w-8" />} title="No tips published yet" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            {tips.map((t, i) => (
              <article
                key={t.id}
                onPointerMove={trackSpotlight}
                className="card-glow spotlight reveal flex min-w-0 gap-4 p-5 sm:p-6"
                style={delay(Math.min(i, 8) * 45)}
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-success/10 text-success">
                  <ShieldCheck className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold tabular-nums text-muted-foreground">
                    Tip {String(i + 1).padStart(2, "0")}
                  </p>
                  <h2 className="mt-1 text-base font-bold leading-snug tracking-tight">
                    {t.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
