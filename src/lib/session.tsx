import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/tanstack-react-start";
import { supabase } from "@/integrations/supabase/client";

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
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    if (!userId) {
      setRoles([]);
      setRolesLoaded(true);
      return;
    }

    setRolesLoaded(false);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (!active) return;
        setRoles((data ?? []).map((r) => r.role as AppRole));
        setRolesLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const user: SessionUser | null =
    isSignedIn && clerkUser
      ? {
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
          fullName: clerkUser.fullName,
        }
      : null;

  const primaryRole = primaryRoleFrom(roles);

  return { user, roles, primaryRole, loading: !authLoaded || !rolesLoaded };
}

export function initials(name: string | null | undefined, fallback = "LF") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || fallback;
}
