import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import {
  ExternalLink,
  FileCheck2,
  Flag,
  LayoutDashboard,
  Newspaper,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { requireRoles } from "@/lib/rbac";
import { Button } from "@/components/ui/button";

const TABS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/content", label: "Content", icon: Newspaper },
  { to: "/admin/applications", label: "Applications", icon: FileCheck2 },
  { to: "/admin/verifications", label: "Verifications", icon: ShieldCheck },
  { to: "/admin/reports", label: "Reports", icon: Flag },
  { to: "/admin/payouts", label: "Payouts", icon: Wallet },
  { to: "/admin/audit", label: "Audit trail", icon: ScrollText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: requireRoles(["admin"]),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <header className="relative isolate overflow-hidden rounded-[1.75rem] surface-ink px-6 py-7 shadow-float sm:px-8 sm:py-8 dark:ring-1 dark:ring-white/10">
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-60" />
        <div
          aria-hidden
          className="animate-aurora absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-[oklch(0.78_0.115_80/0.2)] blur-[90px]"
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-brass">Administration</p>
            <h1 className="mt-2 text-h2 font-bold text-ink-foreground">Control centre</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-foreground/70">
              People, content, verification and platform health in one place. Every change is
              written to the tamper-evident audit trail.
            </p>
          </div>
          <Button asChild variant="outlineInk" size="sm" className="self-start sm:self-auto">
            <a href="/" target="_blank" rel="noreferrer">
              View site <ExternalLink />
            </a>
          </Button>
        </div>
      </header>

      <nav
        aria-label="Admin sections"
        className="sticky top-[calc(3.5rem+var(--safe-top))] z-20 -mx-4 mt-5 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:mx-0 sm:px-0"
      >
        <ul className="flex w-max gap-1 rounded-full border border-border bg-card/85 p-1 shadow-plate backdrop-blur-xl">
          {TABS.map((tab) => (
            <li key={tab.to}>
              <Link
                to={tab.to}
                activeOptions={{ exact: tab.to === "/admin" }}
                className="inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{
                  className: "bg-primary !text-primary-foreground shadow-xs hover:bg-primary",
                  "aria-current": "page",
                }}
              >
                <tab.icon className="h-4 w-4" aria-hidden />
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
}
