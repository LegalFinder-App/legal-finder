import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

const CONTENT_TABS = [
  { to: "/admin/content/advice", label: "Advice" },
  { to: "/admin/content/news", label: "News" },
  { to: "/admin/content/judgements", label: "Judgements" },
  { to: "/admin/content/library", label: "Library" },
  { to: "/admin/content/stations", label: "Stations" },
  { to: "/admin/content/wanted", label: "Wanted" },
  { to: "/admin/content/security-tips", label: "Security tips" },
  { to: "/admin/content/quotes", label: "Quotes" },
] as const;

export const Route = createFileRoute("/_authenticated/admin/content")({
  component: ContentLayout,
});

function ContentLayout() {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {CONTENT_TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
            activeProps={{ className: "border-brass bg-brass/15 text-brass" }}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
