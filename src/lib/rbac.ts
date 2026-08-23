import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { primaryRoleFrom, ROLE_HOME, type AppRole } from "@/lib/session";

export async function loadUserRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((entry) => entry.role as AppRole);
}

export function requireRoles(allowed: AppRole[]) {
  return async ({ context }: { context: { user: { id: string } } }) => {
    const roles = await loadUserRoles(context.user.id);
    if (!allowed.some((role) => roles.includes(role))) {
      throw redirect({ to: ROLE_HOME[primaryRoleFrom(roles)] });
    }
    return { roles };
  };
}

export async function navigateAfterAuth(userId: string) {
  const roles = await loadUserRoles(userId);
  return ROLE_HOME[primaryRoleFrom(roles)];
}
