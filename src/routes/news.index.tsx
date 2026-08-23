import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { LoadingRows, EmptyState } from "@/components/common/bits";
import { newsListQuery } from "@/lib/queries";

export const Route = createFileRoute("/news/")({
  head: () => ({
    meta: [
      { title: "Legal news — LegalFinder" },
      {
        name: "description",
        content:
          "Court rulings, legislative changes and justice-sector news that affect your rights.",
      },
      { property: "og:title", content: "Legal news — LegalFinder" },
      { property: "og:description", content: "Rulings, legislation and justice-sector news." },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  const { data, isLoading } = useQuery(newsListQuery);
  const [lead, ...rest] = data ?? [];

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Newsroom"
        title="What's changing in the law"
        description="Court rulings, new statutes and justice-sector developments, summarised."
      />
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        {isLoading ? (
          <LoadingRows rows={5} />
        ) : !lead ? (
          <EmptyState title="No news published yet" />
        ) : (
          <>
            <Link
              to="/news/$slug"
              params={{ slug: lead.slug ?? lead.id }}
              className="group grid gap-8 overflow-hidden rounded-xl border border-border bg-card shadow-plate lg:grid-cols-2"
            >
              {lead.image_url && (
                <img src={lead.image_url} alt="" className="h-full min-h-64 w-full object-cover" />
              )}
              <div className="flex flex-col justify-center p-8">
                <p className="eyebrow text-brass">Lead story</p>
                <h2 className="mt-3 font-display text-3xl font-semibold leading-tight group-hover:text-brass">
                  {lead.title}
                </h2>
                <p className="mt-3 text-muted-foreground">{lead.summary}</p>
                <p className="mt-5 font-mono text-xs text-muted-foreground">
                  {new Date(lead.published_at).toLocaleDateString()} ·{" "}
                  {lead.source ?? "LegalFinder"}
                </p>
              </div>
            </Link>

            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((n) => (
                <Link
                  key={n.id}
                  to="/news/$slug"
                  params={{ slug: n.slug ?? n.id }}
                  className="group rounded-lg border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-plate"
                >
                  <p className="font-mono text-xs text-muted-foreground">
                    {new Date(n.published_at).toLocaleDateString()}
                  </p>
                  <h3 className="mt-2 font-display text-lg font-semibold leading-snug group-hover:text-brass">
                    {n.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{n.summary}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </PublicLayout>
  );
}
