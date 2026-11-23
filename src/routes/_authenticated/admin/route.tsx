import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { requireRoles } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { WorkspaceFrame } from "@/components/app/shell/workspace-chrome";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: requireRoles(["admin"]),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <WorkspaceFrame wide className="pb-12">
      <header className="relative isolate overflow-hidden rounded-[1.5rem] surface-ink px-5 py-6 shadow-float sm:px-7 sm:py-7 dark:ring-1 dark:ring-white/10">
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-50" />
        <div
          aria-hidden
          className="animate-aurora absolute -right-16 -top-20 -z-10 h-64 w-64 rounded-full bg-[oklch(0.78_0.115_80/0.22)] blur-[90px]"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="eyebrow text-brass">Administration</p>
            <h1 className="mt-2 font-display text-h2 font-bold tracking-tight text-ink-foreground sm:text-[2rem]">
              Control centre
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-foreground/70 sm:text-[0.9375rem]">
              People, content, verification and platform health. Every change is written to the
              tamper-evident audit trail.
            </p>
          </div>
          <Button asChild variant="outlineInk" size="sm" className="self-start sm:self-auto">
            <a href="/" target="_blank" rel="noreferrer">
              View site <ExternalLink />
            </a>
          </Button>
        </div>
      </header>

      <p className="mt-4 text-xs text-muted-foreground lg:hidden">
        Open the sidebar for Users, Applications, Reports and other admin tools.
      </p>

      <div className="mt-6 sm:mt-8">
        <Outlet />
      </div>
    </WorkspaceFrame>
  );
}
