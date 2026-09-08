import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { userRolesQuery } from "@/lib/queries";
import { primaryRoleFrom, ROLE_HOME, type AppRole } from "@/lib/session";

// Shares the exact cache entry useSession()'s useQuery(userRolesQuery(...)) populates, so a role
// change (e.g. from the admin users panel) is visible here without a separate fetch/staleness
// window.
export async function loadUserRoles(queryClient: QueryClient, userId: string): Promise<AppRole[]> {
  const roles = await queryClient.ensureQueryData(userRolesQuery(userId));
  return roles as AppRole[];
}

export function requireRoles(allowed: AppRole[]) {
  return async ({ context }: { context: { user: { id: string }; queryClient: QueryClient } }) => {
    const roles = await loadUserRoles(context.queryClient, context.user.id);
    if (!allowed.some((role) => roles.includes(role))) {
      throw redirect({ to: ROLE_HOME[primaryRoleFrom(roles)] });
    }
    return { roles };
  };
}

export async function navigateAfterAuth(queryClient: QueryClient, userId: string) {
  const roles = await loadUserRoles(queryClient, userId);
  return ROLE_HOME[primaryRoleFrom(roles)];
}
