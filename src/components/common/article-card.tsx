import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CalendarDays, Clock, Newspaper, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

type Article = {
  id: string;
  slug: string | null;
  title: string;
  summary: string | null;
  body?: string | null;
  image_url: string | null;
  author_name?: string | null;
  category?: string | null;
  published_at?: string | null;
  source?: string | null;
};

/** Rough reading time from the article body (≈200 words a minute), never below one minute. */
function readingTime(body?: string | null) {
  if (!body) return null;
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function formatDate(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * The card for advice guides and news posts. Image on top with a fixed ratio (no layout shift),
 * the category as a glass label on the image, then title, summary and a quiet meta footer.
 * `variant="feature"` lays the image beside the text from `lg` up, for a lead story.
 */
export function ArticleCard({
  article,
  kind,
  variant = "default",
  className,
}: {
  article: Article;
  kind: "advice" | "news";
  variant?: "default" | "feature";
  className?: string;
}) {
  const minutes = readingTime(article.body);
  const date = formatDate(article.published_at);
  const label = kind === "advice" ? article.category : "News";
  const byline =
    article.author_name ?? (kind === "news" ? article.source : null) ?? "LegalFinder editorial";
  const feature = variant === "feature";
  const Placeholder = kind === "advice" ? Scale : Newspaper;

  const inner = (
    <>
      <div
        className={cn(
          "card-media shrink-0",
          feature ? "aspect-[16/10] lg:aspect-auto lg:min-h-80" : "aspect-[16/10]",
        )}
      >
        {article.image_url ? (
          <img
            src={article.image_url}
            alt=""
            loading="lazy"
            decoding="async"
            width={800}
            height={500}
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[radial-gradient(120%_90%_at_0%_0%,var(--accent),var(--secondary))]">
            <Placeholder className="h-10 w-10 text-brass/70" aria-hidden />
          </div>
        )}
        {label && (
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-[oklch(0.16_0.035_262/0.55)] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-white ring-1 ring-white/20 backdrop-blur-md">
            {label}
          </span>
        )}
      </div>

      <div
        className={cn("flex flex-1 flex-col p-5", feature && "sm:p-7 lg:justify-center lg:p-10")}
      >
        {(date || minutes) && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {date && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                <time dateTime={article.published_at ?? undefined}>{date}</time>
              </span>
            )}
            {minutes && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {minutes} min read
              </span>
            )}
          </p>
        )}
        <h3
          className={cn(
            "font-bold tracking-tight text-foreground transition-colors group-hover:text-brass",
            feature ? "mt-3 text-h3 lg:text-h2" : "mt-2 line-clamp-2 text-[1.0625rem] leading-snug",
          )}
        >
          {article.title}
        </h3>
        {article.summary && (
          <p
            className={cn(
              "mt-2 text-sm leading-relaxed text-muted-foreground",
              feature ? "line-clamp-4 sm:text-base" : "line-clamp-2",
            )}
          >
            {article.summary}
          </p>
        )}
        {/* Pushes the footer to the bottom while keeping at least 1rem above it. */}
        <div aria-hidden className="min-h-4 flex-1" />
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <span
              aria-hidden
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-[0.7rem] font-bold text-accent-foreground"
            >
              {byline.charAt(0).toUpperCase()}
            </span>
            <span className="truncate">{byline}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-foreground">
            Read
            <ArrowUpRight
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </div>
      </div>
    </>
  );

  const classes = cn(
    "group card card-interactive flex h-full min-w-0 flex-col overflow-hidden",
    feature && "lg:grid lg:grid-cols-[1.15fr_1fr]",
    className,
  );
  const slug = article.slug ?? article.id;

  return kind === "advice" ? (
    <Link to="/advice/$slug" params={{ slug }} className={classes}>
      {inner}
    </Link>
  ) : (
    <Link to="/news/$slug" params={{ slug }} className={classes}>
      {inner}
    </Link>
  );
}

/** Same footprint as ArticleCard, shown while the list loads (no spinners on content). */
export function ArticleCardSkeleton() {
  return (
    <div aria-hidden className="card flex h-full flex-col overflow-hidden">
      <div className="aspect-[16/10] animate-pulse bg-muted" />
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-4/5 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-full animate-pulse rounded-full bg-muted/70" />
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-muted/70" />
        <div className="mt-3 flex items-center justify-between border-t border-border pt-4">
          <div className="h-7 w-28 animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-10 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}
