import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireClerkAuth } from "@/integrations/supabase/auth-middleware";

const deleteUserSchema = z.object({ userId: z.string().min(1) });

/**
 * Deletes a user's Clerk account and their Supabase profile/role rows. Gated by an explicit
 * admin-role check here (not RLS) because it also calls the Clerk Management API, which RLS
 * can't reach — unlike assignRole/revokeRole in mutations.ts, which run as the caller and rely
 * entirely on the admin-only RLS policy on user_roles.
 */
export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .validator(deleteUserSchema)
  .handler(async ({ context, data }) => {
    if (data.userId === context.userId) {
      throw new Error("You can't delete your own account.");
    }

    const { data: callerRoles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleError) throw new Error(roleError.message);
    if (!callerRoles?.some((row) => row.role === "admin")) {
      throw new Error("Only administrators can delete users.");
    }

    const { deprovisionUser } = await import("@/integrations/clerk/deprovisioning.server");
    await deprovisionUser(data.userId);
  });
