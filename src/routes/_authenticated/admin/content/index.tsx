import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileStack, Globe, PencilLine } from "lucide-react";
import { CONTENT_TYPES } from "@/components/app/admin/content/registry";
import { contentCountsQuery } from "@/components/app/admin/content/content-counts";
import { StatCard } from "@/components/common/bits";
import { delay } from "@/lib/motion";

export const Route = createFileRoute("/_authenticated/admin/content/")({
  component: ContentHome,
});

/** CMS home: totals across the site, then one card per content type. */
function ContentHome() {
  const { data, isLoading } = useQuery(contentCountsQuery);
  const all = Object.values(data ?? {});
  const total = all.reduce((n, c) => n + c.total, 0);
  const published = all.reduce((n, c) => n + (c.published ?? 0), 0);
  const drafts = all.reduce((n, c) => n + (c.published === null ? 0 : c.total - c.published), 0);
  const show = (n: number) => (isLoading ? "—" : n.toLocaleString("en-GB"));

  return (
    <div>
      <h2 className="text-h4 font-bold">Content</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Everything the public site shows. Changes go live as soon as you save, and every edit is
        recorded in the audit trail.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Items"
          value={show(total)}
          icon={<FileStack />}
          hint="Across all content types"
        />
        <StatCard
          label="Published"
          value={show(published)}
          icon={<Globe />}
          hint="Advice, news, judgements"
        />
        <StatCard
          label="Drafts"
          value={show(drafts)}
          icon={<PencilLine />}
          hint="Not visible on the site"
        />
      </div>

      <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {CONTENT_TYPES.map((type, i) => {
          const c = data?.[type.id];
          return (
            <li key={type.id} className="animate-rise min-w-0" style={delay(i * 40)}>
              <Link to={type.path} className="card card-interactive group flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-brass ring-1 ring-brass/15">
                    <type.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-2xl font-bold tabular-nums tracking-tight">
                    {isLoading ? "—" : (c?.total ?? 0)}
                  </span>
                </div>
                <p className="mt-4 font-bold tracking-tight group-hover:text-brass">{type.label}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {type.config.description}
                </p>
                <div aria-hidden className="min-h-3 flex-1" />
                <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                  <span className="text-muted-foreground">
                    {c?.published != null
                      ? `${c.published} published · ${c.total - c.published} drafts`
                      : "Always visible"}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold">
                    Manage
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
