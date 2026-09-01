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
} from "@/components/ui/sidebar";
import { navGroupsForRole } from "./nav-config";
import { ROLE_LABELS, useSession } from "@/lib/session";

export function AppSidebar() {
  const { primaryRole, roles } = useSession();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const groups = navGroupsForRole(primaryRole);

  // Highlight only the most specific matching item (so /admin/audit doesn't also light up /admin).
  const allPaths = groups.flatMap((group) => group.items.map((item) => item.to));
  const bestMatch = allPaths
    .filter((to) => pathname === to || pathname.startsWith(`${to}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sidebar-foreground hover:bg-sidebar-accent group-data-[collapsible=icon]:justify-center"
        >
          <Logo compact className="text-sidebar-foreground" />
          <span className="font-display text-sm font-semibold leading-none group-data-[collapsible=icon]:hidden">
            LegalFinder
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = item.to === bestMatch;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                        <Link to={item.to}>
                          <item.icon />
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
      <SidebarFooter>
        <p className="px-2 py-1 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          {ROLE_LABELS[primaryRole]}
          {roles.length > 1 ? ` · ${roles.length} roles` : ""}
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
