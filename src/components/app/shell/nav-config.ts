import {
  Briefcase,
  Database,
  FileCheck2,
  Flag,
  FolderCog,
  Gavel,
  LayoutDashboard,
  MessageSquare,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { CounsellorNavIcon } from "@/components/brand/counsellor-mark";
import type { AppRole } from "@/lib/session";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon | ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
  roles: AppRole[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const ALL_ROLES: AppRole[] = ["user", "lawyer", "police", "judiciary", "admin"];

/**
 * Single source of truth for sidebar + command palette.
 * Admin destinations that used to live only in horizontal pill tabs live here too.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { to: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: ALL_ROLES },
      { to: "/messages", label: "Messages", icon: MessageSquare, roles: ALL_ROLES },
      { to: "/assistant", label: "Counsellor AI", icon: CounsellorNavIcon, roles: ALL_ROLES },
    ],
  },
  {
    label: "Practice",
    items: [{ to: "/practice", label: "Advocate desk", icon: Briefcase, roles: ["lawyer", "admin"] }],
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
      { to: "/admin", label: "Control centre", icon: LayoutDashboard, roles: ["admin"] },
      { to: "/admin/users", label: "Users & roles", icon: Users, roles: ["admin"] },
      { to: "/admin/applications", label: "Applications", icon: FileCheck2, roles: ["admin"] },
      { to: "/admin/verifications", label: "Verifications", icon: ShieldCheck, roles: ["admin"] },
      { to: "/admin/reports", label: "Reports", icon: Flag, roles: ["admin"] },
      { to: "/admin/payouts", label: "Payouts", icon: Wallet, roles: ["admin"] },
      { to: "/admin/content", label: "Content", icon: FolderCog, roles: ["admin"] },
      { to: "/admin/corpus", label: "Corpus", icon: Database, roles: ["admin"] },
      { to: "/admin/audit", label: "Audit trail", icon: ScrollText, roles: ["admin"] },
      { to: "/admin/settings", label: "Platform settings", icon: Settings, roles: ["admin"] },
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

/** Flat lookup used for breadcrumb labels — longest prefix match. */
export function labelForPath(pathname: string): string | undefined {
  let best: { to: string; label: string } | undefined;
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (pathname === item.to || pathname.startsWith(`${item.to}/`)) {
        if (!best || item.to.length > best.to.length) best = item;
      }
    }
  }
  return best?.label;
}
