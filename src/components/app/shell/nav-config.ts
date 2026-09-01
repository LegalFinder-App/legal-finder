import {
  Activity,
  Briefcase,
  FolderCog,
  Gavel,
  LayoutDashboard,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppRole } from "@/lib/session";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: AppRole[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const ALL_ROLES: AppRole[] = ["user", "lawyer", "police", "judiciary", "admin"];

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { to: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: ALL_ROLES },
      { to: "/messages", label: "Messages", icon: MessageSquare, roles: ALL_ROLES },
      { to: "/assistant", label: "Assistant", icon: Sparkles, roles: ALL_ROLES },
    ],
  },
  {
    label: "Council",
    items: [{ to: "/practice", label: "Practice", icon: Briefcase, roles: ["lawyer", "admin"] }],
  },
  {
    label: "Police",
    items: [{ to: "/precinct", label: "Precinct", icon: ShieldAlert, roles: ["police", "admin"] }],
  },
  {
    label: "Judiciary",
    items: [{ to: "/bench", label: "Bench", icon: Gavel, roles: ["judiciary", "admin"] }],
  },
  {
    label: "Administration",
    items: [
      { to: "/admin", label: "Overview", icon: Activity, roles: ["admin"] },
      { to: "/admin/audit", label: "Audit trail", icon: ShieldCheck, roles: ["admin"] },
      { to: "/admin/verifications", label: "Verifications", icon: Users, roles: ["admin"] },
      { to: "/admin/users", label: "Users & roles", icon: Users, roles: ["admin"] },
      { to: "/admin/content", label: "Content", icon: FolderCog, roles: ["admin"] },
    ],
  },
];

/** Nav groups filtered to the items a given role can see; empty groups are dropped. */
export function navGroupsForRole(role: AppRole): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}

/** Flat lookup used for breadcrumb labels — matches by exact `to` path. */
export function labelForPath(pathname: string): string | undefined {
  for (const group of NAV_GROUPS) {
    const match = group.items.find((item) => item.to === pathname);
    if (match) return match.label;
  }
  return undefined;
}
