import { useQuery } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/tanstack-react-start";
import { userRolesQuery } from "@/lib/queries";

export type AppRole = "user" | "lawyer" | "police" | "judiciary" | "admin";

export const ROLE_LABELS: Record<AppRole, string> = {
  user: "Client",
  lawyer: "Advocate",
  police: "Police",
  judiciary: "Judiciary",
  admin: "Administrator",
};

export const ROLE_HOME: Record<AppRole, string> = {
  user: "/dashboard",
  lawyer: "/practice",
  police: "/precinct",
  judiciary: "/bench",
  admin: "/admin",
};

/** Minimal identity shape every consumer in the app actually uses — not Clerk's full user object. */
export interface SessionUser {
  id: string;
  email: string | null;
  fullName: string | null;
}

export interface SessionState {
  user: SessionUser | null;
  roles: AppRole[];
  primaryRole: AppRole;
  loading: boolean;
}

const ROLE_PRIORITY: AppRole[] = ["admin", "judiciary", "police", "lawyer", "user"];

export function primaryRoleFrom(roles: AppRole[]): AppRole {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? "user";
}

export function useSession(): SessionState {
  const { isLoaded: authLoaded, userId, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const rolesQuery = useQuery(userRolesQuery(userId ?? undefined));
  const roles = rolesQuery.data ?? [];

  const user: SessionUser | null =
    isSignedIn && clerkUser
      ? {
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
          fullName: clerkUser.fullName,
        }
      : null;

  const primaryRole = primaryRoleFrom(roles);

  return { user, roles, primaryRole, loading: !authLoaded || rolesQuery.isLoading };
}

export function initials(name: string | null | undefined, fallback = "LF") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || fallback;
}
