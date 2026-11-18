import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth, useUser } from "@clerk/tanstack-react-start";
import { userRolesQuery } from "@/lib/queries";
import { clientClerkUserId } from "@/lib/after-auth";

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
  /** True only while Clerk itself is still booting — not while roles are fetching. */
  loading: boolean;
}

const ROLE_PRIORITY: AppRole[] = ["admin", "judiciary", "police", "lawyer", "user"];

export function primaryRoleFrom(roles: AppRole[]): AppRole {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? "user";
}

/**
 * useAuth() can lag behind window.Clerk after finalize (cookie not visible yet). The workspace
 * gate already accepts the client session; the rest of the UI must too — otherwise Counsellor
 * consent stays on a blank skeleton and the marketing header keeps showing Sign in.
 */
function subscribeClerkClient(onStoreChange: () => void) {
  if (typeof window === "undefined" || !window.Clerk) return () => {};
  const clerk = window.Clerk as {
    addListener?: (cb: () => void) => () => void;
  };
  if (typeof clerk.addListener === "function") {
    return clerk.addListener(onStoreChange);
  }
  return () => {};
}

function readClerkClientUserId() {
  return clientClerkUserId();
}

export function useSession(): SessionState {
  const { isLoaded: authLoaded, userId, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const clientId = useSyncExternalStore(subscribeClerkClient, readClerkClientUserId, () => null);

  const effectiveId = userId ?? clientId;
  const signedIn = Boolean(isSignedIn || effectiveId);

  const rolesQuery = useQuery(userRolesQuery(effectiveId ?? undefined));
  const roles = (rolesQuery.data ?? []) as AppRole[];

  const user: SessionUser | null =
    signedIn && effectiveId
      ? {
          id: effectiveId,
          email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
          fullName: clerkUser?.fullName ?? null,
        }
      : null;

  const primaryRole = primaryRoleFrom(roles);

  return { user, roles, primaryRole, loading: !authLoaded };
}

export function initials(name: string | null | undefined, fallback = "LF") {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || fallback;
}
