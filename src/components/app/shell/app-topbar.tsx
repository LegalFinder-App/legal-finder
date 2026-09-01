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
import { ROLE_HOME, useSession } from "@/lib/session";

function titleCase(segment: string) {
  return segment.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function AppTopbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { primaryRole } = useSession();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  const label =
    labelForPath(pathname) ?? titleCase(pathname.split("/").filter(Boolean).pop() ?? "");

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <Breadcrumb className="hidden sm:block">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={ROLE_HOME[primaryRole]}>Workspace</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {label && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{label}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <button
        type="button"
        onClick={onOpenSearch}
        className="ml-auto hidden items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary sm:flex"
      >
        <Search className="h-3.5 w-3.5" />
        Search
        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[0.65rem]">
          {typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="Search"
        className="ml-auto grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-accent sm:hidden"
      >
        <Search className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-1 sm:ml-2">
        <ThemeToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
