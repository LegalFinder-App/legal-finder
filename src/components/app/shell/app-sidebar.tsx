import { Link, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/brand/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { navGroupsForRole } from "./nav-config";
import { ROLE_LABELS, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const { primaryRole, roles, user } = useSession();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const groups = navGroupsForRole(primaryRole);

  // Highlight only the most specific matching item (so /admin/audit doesn't also light up /admin).
  const allPaths = groups.flatMap((group) => group.items.map((item) => item.to));
  const bestMatch = allPaths
    .filter((to) => pathname === to || pathname.startsWith(`${to}/`))
    .sort((a, b) => b.length - a.length)[0];

  const displayName = user?.fullName?.split(" ")[0] || "Account";

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="gap-3 border-b border-sidebar-border/80 px-3 py-3">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center"
        >
          <Logo compact className="text-sidebar-foreground" />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="font-display text-sm font-semibold leading-none tracking-tight">
              LegalFinder
            </p>
            <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/50">
              Uganda justice
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-1 px-1 py-2">
        {groups.map((group, index) => (
          <SidebarGroup key={group.label} className="py-1">
            {index > 0 ? <SidebarSeparator className="mb-2 opacity-60" /> : null}
            <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const active = item.to === bestMatch;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className={cn(
                          "relative h-9 rounded-xl transition-[background-color,color,box-shadow]",
                          active
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_3px_0_0_0_var(--sidebar-primary)] data-[active=true]:bg-sidebar-accent"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <Link to={item.to}>
                          <item.icon
                            className={cn(
                              "h-4 w-4",
                              active ? "text-[var(--sidebar-primary)]" : "opacity-80",
                            )}
                          />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/80 p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-sidebar-accent/50 px-2.5 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <span
            aria-hidden
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--sidebar-primary)]/15 text-[10px] font-bold uppercase tracking-wide text-[var(--sidebar-primary)] ring-1 ring-[var(--sidebar-primary)]/25"
          >
            {displayName.slice(0, 1)}
          </span>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-xs font-semibold text-sidebar-accent-foreground">
              {displayName}
            </p>
            <p className="truncate text-[10px] text-sidebar-foreground/55">
              {ROLE_LABELS[primaryRole]}
              {roles.length > 1 ? ` · ${roles.length} roles` : ""}
            </p>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
