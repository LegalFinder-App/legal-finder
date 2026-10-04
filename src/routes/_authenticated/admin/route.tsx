import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { requireRoles } from "@/lib/rbac";

const TABS = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/audit", label: "Audit trail" },
  { to: "/admin/applications", label: "Applications" },
  { to: "/admin/verifications", label: "Verifications" },
  { to: "/admin/reports", label: "Reports" },
  { to: "/admin/users", label: "Users & roles" },
  { to: "/admin/content", label: "Content" },
  { to: "/admin/settings", label: "Settings" },
] as const;

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: requireRoles(["admin"]),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow text-brass">Administration</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Admin dashboard</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Platform analytics, the tamper-evident audit trail, advocate verification, reports, user
        roles and site content all live here.
      </p>

      <nav className="mt-8 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            activeOptions={{ exact: tab.to === "/admin" }}
            className="-mb-px rounded-t-md border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            activeProps={{ className: "border-brass text-brass" }}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        <Outlet />
      </div>
    </div>
  );
}
