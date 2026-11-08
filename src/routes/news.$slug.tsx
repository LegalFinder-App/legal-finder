import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { PublicLayout } from "@/components/site/public-layout";
import { EmptyState, QueryError } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { newsQuery } from "@/lib/queries";
import { MarkdownLite } from "@/lib/markdown-lite";
import { prefetchForPage } from "@/lib/prefetch";
import { appSettingsQuery } from "@/lib/app-settings";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/news/$slug")({
  head: () => ({
    meta: [
      { title: "Legal news — LegalFinder" },
      {
        name: "description",
        content: "A news report from the LegalFinder justice-sector newsroom.",
      },
      { property: "og:title", content: "Legal news — LegalFinder" },
      { property: "og:description", content: "A report from the LegalFinder newsroom." },
      { property: "og:type", content: "article" },
    ],
  }),
  loader: ({ context: { queryClient }, params }) =>
    prefetchForPage([
      queryClient.prefetchQuery(newsQuery(params.slug)),
      queryClient.prefetchQuery(appSettingsQuery),
    ]),
  component: NewsDetail,
});

function NewsDetail() {
  const { slug } = Route.useParams();
  const { data, isLoading, isError, error, refetch } = useQuery(newsQuery(slug));

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-3xl px-4 py-24">
          <div className="h-96 animate-pulse rounded-xl bg-muted" />
        </div>
      </PublicLayout>
    );
  }

  if (isError) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-2xl px-4 py-28">
          <QueryError
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
          />
        </div>
      </PublicLayout>
    );
  }

  if (!data) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-2xl px-4 py-28">
          <EmptyState
            title="Story not found"
            description="This story may have been unpublished or the link is out of date."
            action={
              <Button asChild variant="brass">
                <Link to="/news">Back to news</Link>
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
          to="/news"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brass"
        >
          <ArrowLeft className="h-4 w-4" /> Newsroom
        </Link>
        <h1 className="mt-8 font-display text-4xl font-semibold leading-tight">{data.title}</h1>
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          {formatDate(data.published_at)} · {data.source ?? "LegalFinder"}
        </p>
        {data.image_url && (
          <img src={data.image_url} alt="" className="mt-8 w-full rounded-xl object-cover" />
        )}
        <MarkdownLite
          text={data.body}
          className="mt-8 space-y-5 text-[1.02rem] leading-[1.75] text-foreground/90"
        />
      </article>
    </PublicLayout>
  );
}
