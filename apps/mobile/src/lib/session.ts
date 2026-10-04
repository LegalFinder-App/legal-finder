import { useAuth, useUser } from "./auth";
import { useQuery } from "@tanstack/react-query";
import { profileQuery, userRolesQuery } from "./queries";

// Mirrors src/lib/session.tsx on the web.
export type AppRole = "user" | "lawyer" | "police" | "judiciary" | "admin";

export const ROLE_LABELS: Record<AppRole, string> = {
  user: "Client",
  lawyer: "Advocate",
  police: "Police",
  judiciary: "Judiciary",
  admin: "Administrator",
};

const ROLE_PRIORITY: AppRole[] = ["admin", "judiciary", "police", "lawyer", "user"];

export function primaryRoleFrom(roles: string[]): AppRole {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? "user";
}

export interface SessionUser {
  id: string;
  email: string | null;
  fullName: string | null;
  imageUrl: string | null;
}

export function useSession() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user: clerkUser } = useUser();
  const rolesQuery = useQuery(userRolesQuery(isSignedIn ? (userId ?? undefined) : undefined));
  const roles = (rolesQuery.data ?? []) as AppRole[];
  // The photo people upload (here or on the website) is saved on their profile, not in Clerk —
  // Clerk only has one for social sign-ins, and otherwise hands out a generic placeholder.
  const profile = useQuery(profileQuery(isSignedIn ? (userId ?? undefined) : undefined));

  const user: SessionUser | null =
    isSignedIn && clerkUser
      ? {
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
          fullName:
            clerkUser.fullName ??
            (typeof clerkUser.unsafeMetadata?.full_name === "string"
              ? (clerkUser.unsafeMetadata.full_name as string)
              : null),
          imageUrl: profile.data?.avatar_url || (clerkUser.hasImage ? clerkUser.imageUrl : null),
        }
      : null;

  return {
    user,
    roles,
    primaryRole: primaryRoleFrom(roles),
    isSignedIn: Boolean(isSignedIn),
    loading: !isLoaded || (Boolean(isSignedIn) && rolesQuery.isLoading),
    hasRole: (role: AppRole) => roles.includes(role),
  };
}
