import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { LoadingRows, EmptyState } from "@/components/common/bits";
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
  const { data, isLoading } = useQuery(securityTipsQuery);

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
        ) : (data ?? []).length === 0 ? (
          <EmptyState icon={<ShieldCheck className="h-8 w-8" />} title="No tips published yet" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {(data ?? []).map((t) => (
              <div key={t.id} className="rounded-lg border border-border bg-card p-6 shadow-plate">
                <ShieldCheck className="h-5 w-5 text-brass" />
                <h2 className="mt-4 font-display text-lg font-semibold">{t.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
