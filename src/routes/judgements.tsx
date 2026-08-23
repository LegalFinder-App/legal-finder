import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Gavel, Search, FileDown } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { LoadingRows, EmptyState } from "@/components/common/bits";
import { judgementsQuery } from "@/lib/queries";

export const Route = createFileRoute("/judgements")({
  head: () => ({
    meta: [
      { title: "Court judgements — LegalFinder" },
      {
        name: "description",
        content:
          "Search reported court decisions by court, judge or case number, with structured summaries.",
      },
      { property: "og:title", content: "Court judgements — LegalFinder" },
      { property: "og:description", content: "Reported decisions with structured summaries." },
    ],
  }),
  component: JudgementsPage,
});

function JudgementsPage() {
  const { data, isLoading } = useQuery(judgementsQuery);
  const [q, setQ] = useState("");
  const items = (data ?? []).filter((j) =>
    `${j.title} ${j.case_number} ${j.court} ${j.judge ?? ""}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Case law"
        title="Reported judgements"
        description="Decisions published by the judiciary, searchable by court, judge and case number."
      >
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-foreground/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search citation, party or judge"
            className="h-12 w-full rounded-md border border-ink-foreground/20 bg-ink-foreground/5 pl-10 pr-4 text-sm text-ink-foreground placeholder:text-ink-foreground/40 focus:border-brass focus:outline-none"
          />
        </div>
      </PageHeader>

      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        {isLoading ? (
          <LoadingRows rows={6} />
        ) : items.length === 0 ? (
          <EmptyState icon={<Gavel className="h-8 w-8" />} title="No judgements found" />
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {items.map((j) => (
              <article key={j.id} className="py-7">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
                  <span className="text-brass">{j.case_number}</span>
                  <span>{j.court}</span>
                  {j.decided_on && <span>{new Date(j.decided_on).toLocaleDateString()}</span>}
                </div>
                <h2 className="mt-2 font-display text-xl font-semibold leading-snug">{j.title}</h2>
                {j.judge && <p className="mt-1 text-sm text-muted-foreground">Before {j.judge}</p>}
                {j.summary && (
                  <p className="mt-3 leading-relaxed text-muted-foreground">{j.summary}</p>
                )}
                {j.file_url && (
                  <a
                    href={j.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brass hover:underline"
                  >
                    <FileDown className="h-4 w-4" /> Download full text
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
