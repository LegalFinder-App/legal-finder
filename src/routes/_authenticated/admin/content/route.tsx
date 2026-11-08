import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LayoutGrid } from "lucide-react";
import { CONTENT_TYPES } from "@/components/app/admin/content/registry";
import { contentCountsQuery } from "@/components/app/admin/content/content-counts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/content")({
  component: ContentLayout,
});

/** CMS shell: a content rail on desktop, scrollable chips on phones, the editor on the right. */
function ContentLayout() {
  const counts = useQuery(contentCountsQuery);
  const linkBase =
    "group flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:w-full";
  const active = "bg-primary !text-primary-foreground shadow-xs hover:bg-primary";

  return (
    <div className="grid gap-6 lg:grid-cols-[14rem_1fr] lg:gap-8">
      <nav
        aria-label="Content types"
        className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:sticky lg:top-24 lg:flex-col lg:self-start lg:overflow-visible"
      >
        <Link
          to="/admin/content"
          activeOptions={{ exact: true }}
          className={linkBase}
          activeProps={{ className: active }}
        >
          <LayoutGrid className="h-4 w-4" aria-hidden />
          <span className="whitespace-nowrap">All content</span>
        </Link>
        <p className="eyebrow mt-3 hidden px-3 text-muted-foreground lg:block">Content types</p>
        {CONTENT_TYPES.map((type) => {
          const n = counts.data?.[type.id]?.total;
          return (
            <Link
              key={type.id}
              to={type.path}
              className={linkBase}
              activeProps={{ className: active }}
            >
              <type.icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="whitespace-nowrap lg:flex-1">{type.label}</span>
              {n !== undefined && (
                <span
                  className={cn(
                    "rounded-full bg-secondary px-1.5 text-[0.68rem] font-semibold tabular-nums text-muted-foreground",
                    "group-data-[status=active]:bg-white/15 group-data-[status=active]:text-primary-foreground",
                  )}
                >
                  {n}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
