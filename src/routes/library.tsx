import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ExternalLink } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { LoadingRows, EmptyState } from "@/components/common/bits";
import { libraryQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import library from "@/assets/library.jpg";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Legal e-library — LegalFinder" },
      {
        name: "description",
        content: "Statutes, constitutions, practice manuals and reference texts, free to read.",
      },
      { property: "og:title", content: "Legal e-library — LegalFinder" },
      { property: "og:description", content: "Statutes, manuals and reference texts, free to read." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { data, isLoading } = useQuery(libraryQuery);
  const [cat, setCat] = useState<string | null>(null);
  const cats = Array.from(new Set((data ?? []).map((i) => i.category)));
  const items = (data ?? []).filter((i) => !cat || i.category === cat);

  return (
    <PublicLayout>
      <section className="relative isolate overflow-hidden surface-ink">
        <img src={library} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <p className="eyebrow text-brass">E-library</p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold text-ink-foreground lg:text-5xl">
            The texts every case starts from
          </h1>
          <p className="mt-4 max-w-xl text-ink-foreground/65">
            Constitutions, statutes, procedure rules and practice manuals — collected, tagged and
            free to read.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCat(null)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm",
              !cat ? "border-brass bg-brass/15 font-semibold" : "border-border text-muted-foreground",
            )}
          >
            All
          </button>
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm",
                cat === c
                  ? "border-brass bg-brass/15 font-semibold"
                  : "border-border text-muted-foreground hover:bg-secondary",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-10">
          {isLoading ? (
            <LoadingRows rows={5} />
          ) : items.length === 0 ? (
            <EmptyState icon={<BookOpen className="h-8 w-8" />} title="Library is empty" />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((i) => (
                <div
                  key={i.id}
                  className="flex flex-col rounded-lg border border-border bg-card p-6 shadow-plate"
                >
                  <p className="eyebrow text-brass">{i.category}</p>
                  <h2 className="mt-2 font-display text-lg font-semibold leading-snug">{i.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[i.author, i.year].filter(Boolean).join(" · ")}
                  </p>
                  {i.description && (
                    <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                      {i.description}
                    </p>
                  )}
                  {i.file_url && (
                    <a
                      href={i.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-brass hover:underline"
                    >
                      Open <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}