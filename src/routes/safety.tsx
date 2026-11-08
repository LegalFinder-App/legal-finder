import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { LoadingRows, EmptyState, QueryError } from "@/components/common/bits";
import { securityTipsQuery } from "@/lib/queries";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety & security tips — LegalFinder" },
      {
        name: "description",
        content:
          "Practical safety guidance: what to do during an arrest, how to protect evidence, and how to stay safe.",
      },
      { property: "og:title", content: "Safety & security tips — LegalFinder" },
      {
        property: "og:description",
        content: "Practical guidance for staying safe and protecting your rights.",
      },
    ],
  }),
  component: SafetyPage,
});

function SafetyPage() {
  const { data, isLoading, isError, error, refetch } = useQuery(securityTipsQuery);

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Stay safe"
        title="Safety & security guidance"
        description="Short, practical steps for the moments that matter most."
      />
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        {isLoading ? (
          <LoadingRows rows={4} />
        ) : isError ? (
          <QueryError
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
          />
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon={<ShieldCheck className="h-8 w-8" />} title="No tips published yet" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            {(data ?? []).map((t, i) => (
              <article key={t.id} className="card flex min-w-0 gap-4 p-5 sm:p-6">
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
