import { Link, useRouterState } from "@tanstack/react-router";
import { Search } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";
import { UserMenu } from "./user-menu";
import { labelForPath } from "./nav-config";
import { ROLE_HOME, ROLE_LABELS, useSession } from "@/lib/session";

function titleCase(segment: string) {
  return segment.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function AppTopbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { primaryRole } = useSession();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const label =
    labelForPath(pathname) ?? titleCase(pathname.split("/").filter(Boolean).pop() ?? "");
  const homeLabel = ROLE_LABELS[primaryRole];

  return (
    <header className="sticky top-0 z-30 flex min-h-14 shrink-0 items-center gap-2 border-b border-border/70 bg-background/85 px-3 px-safe pt-safe backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 sm:gap-3 sm:px-5">
      <SidebarTrigger className="rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground" />
      <Separator orientation="vertical" className="hidden h-5 sm:block" />

      <div className="hidden min-w-0 flex-1 items-center gap-3 sm:flex">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  to={ROLE_HOME[primaryRole]}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {homeLabel}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {label ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-medium text-foreground">{label}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : null}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <p className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight text-foreground sm:hidden">
        {label || homeLabel}
      </p>

      <button
        type="button"
        onClick={onOpenSearch}
        className="ml-auto hidden h-9 max-w-xs flex-1 items-center gap-2 rounded-xl border border-border/80 bg-secondary/35 px-3 text-xs text-muted-foreground shadow-sm transition-[border-color,background-color,color] hover:border-brass/35 hover:bg-secondary/70 hover:text-foreground sm:flex lg:max-w-sm"
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-brass/80" />
        <span className="flex-1 truncate text-left">Search workspace…</span>
        <kbd className="rounded-md border border-border/80 bg-background/90 px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground">
          {typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="Search"
        className="grid h-9 w-9 place-items-center rounded-xl border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-secondary hover:text-foreground sm:hidden"
      >
        <Search className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-0.5 rounded-xl border border-border/60 bg-card/60 p-0.5 shadow-sm sm:ml-1">
        <ThemeToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
