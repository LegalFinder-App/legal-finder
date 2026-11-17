import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CalendarDays, Clock, Scale } from "lucide-react";
import { PublicLayout } from "@/components/site/public-layout";
import { EmptyState, QueryError } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { adviceQuery } from "@/lib/queries";
import { MarkdownLite } from "@/lib/markdown-lite";
import { prefetchForPage } from "@/lib/prefetch";
import { appSettingsQuery } from "@/lib/app-settings";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/advice/$slug")({
  // Prefetch for the page, then hand the record's name to head() for the tab title.
  loader: async ({ context: { queryClient }, params }) => {
    await prefetchForPage([
      queryClient.prefetchQuery(adviceQuery(params.slug)),
      queryClient.prefetchQuery(appSettingsQuery),
    ]);
    const record = queryClient.getQueryData(adviceQuery(params.slug).queryKey) as
      { title?: string | null } | null | undefined;
    return { pageTitle: record?.title ?? null };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.pageTitle
          ? `LegalFinder | ${loaderData.pageTitle}`
          : "LegalFinder | Legal guide",
      },
      {
        name: "description",
        content: "A plain-language legal guide from the LegalFinder advice library.",
      },
      {
        property: "og:title",
        content: loaderData?.pageTitle
          ? `LegalFinder | ${loaderData.pageTitle}`
          : "LegalFinder | Legal guide",
      },
      { property: "og:description", content: "A plain-language legal guide from LegalFinder." },
      { property: "og:type", content: "article" },
    ],
  }),
  component: AdviceDetail,
});

function readingTime(body?: string | null) {
  if (!body) return null;
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function AdviceDetail() {
  const { slug } = Route.useParams();
  const { data, isLoading, isError, error, refetch } = useQuery(adviceQuery(slug));

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="h-4 w-28 animate-pulse rounded-full bg-muted" />
          <div className="mt-8 h-10 w-4/5 animate-pulse rounded-full bg-muted" />
          <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-muted/70" />
          <div className="mt-2 h-4 w-2/3 animate-pulse rounded-full bg-muted/70" />
          <div className="mt-10 aspect-[16/10] animate-pulse rounded-[1.5rem] bg-muted" />
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
            title="Guide not found"
            description="This guide may have been unpublished or the link is out of date."
            action={
              <Button asChild variant="brass">
                <Link to="/advice">Back to advice</Link>
              </Button>
            }
          />
        </div>
      </PublicLayout>
    );
  }

  const minutes = readingTime(data.body);
  const byline = data.author_name ?? "LegalFinder editorial";

  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <Link
          to="/advice"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-brass"
        >
          <ArrowLeft className="h-4 w-4" /> All guides
        </Link>

        <header className="mt-8">
          <p className="inline-flex items-center gap-2 eyebrow text-brass">
            <Scale className="h-3.5 w-3.5" aria-hidden />
            {data.category}
          </p>
          <h1 className="mt-3 text-balance text-h1 font-bold tracking-tight">{data.title}</h1>
          {data.summary && (
            <p className="mt-4 text-lead leading-relaxed text-muted-foreground">{data.summary}</p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border py-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 font-medium text-foreground">
              <span
                aria-hidden
                className="grid h-8 w-8 place-items-center rounded-full bg-accent text-[0.75rem] font-bold text-accent-foreground"
              >
                {byline.charAt(0).toUpperCase()}
              </span>
              {byline}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              <time dateTime={data.created_at}>{formatDate(data.created_at)}</time>
            </span>
            {minutes && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {minutes} min read
              </span>
            )}
          </div>
        </header>

        {data.image_url && (
          <figure className="mt-8 overflow-hidden rounded-[1.5rem] border border-border shadow-xs">
            <img
              src={data.image_url}
              alt=""
              width={1200}
              height={750}
              className="aspect-[16/10] w-full object-cover"
            />
          </figure>
        )}

        <MarkdownLite
          text={data.body}
          className="mt-10 space-y-5 text-[1.05rem] leading-[1.8] text-foreground/90"
        />

        <aside className="relative isolate mt-14 overflow-hidden rounded-[1.75rem] surface-ink p-7 text-center shadow-float sm:p-10 dark:ring-1 dark:ring-white/10">
          <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-40" />
          <h2 className="text-h3 font-bold text-ink-foreground">
            Need advice on your own situation?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-foreground/75">
            Speak to a verified advocate who handles matters like this every week.
          </p>
          <Button asChild variant="brass" size="lg" className="mt-6 rounded-full">
            <Link to="/lawyers">
              Find an advocate <ArrowRight />
            </Link>
          </Button>
        </aside>
      </article>
    </PublicLayout>
  );
}
