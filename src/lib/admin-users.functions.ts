import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireClerkAuth } from "@/integrations/supabase/auth-middleware";
import type { AppDatabase } from "@/integrations/supabase/app-database";

// Same shape deprovisionUser() insists on: a Clerk id, or a pre-Clerk account's UUID.
const deleteUserSchema = z.object({
  userId: z
    .string()
    .regex(
      /^(user_[A-Za-z0-9]{1,64}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/,
      "That isn't a valid account id.",
    ),
});

/** Shared by every admin-only function in this file — checks the role explicitly (not RLS)
 * because these also call the Clerk Management API, which RLS can't reach. */
async function requireAdmin(context: {
  supabase: SupabaseClient<AppDatabase>;
  userId: string;
}): Promise<void> {
  const { data: callerRoles, error: roleError } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (roleError) throw new Error(roleError.message);
  if (!callerRoles?.some((row) => row.role === "admin")) {
    throw new Error("Only administrators can do this.");
  }
}

/** Deletes a user's Clerk account and their Supabase profile/role rows. */
export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .validator(deleteUserSchema)
  .handler(async ({ context, data }) => {
    if (data.userId === context.userId) {
      throw new Error("You can't delete your own account.");
    }
    await requireAdmin(context);

    const { deprovisionUser } = await import("@/integrations/clerk/deprovisioning.server");
    await deprovisionUser(data.userId);
  });

/**
 * One-off repair for accounts provisioned before ensureProfileProvisioned read the wrong Clerk
 * field for full name (it read firstName/lastName, which the password sign-up form never sets —
 * the form only sets unsafeMetadata.full_name). ensureProfileProvisioned only runs once per user,
 * so already-created rows stay blank forever without this: re-reads each blank profile's Clerk
 * user record and fills it in from unsafeMetadata.full_name (falling back to firstName/lastName
 * for accounts created via social sign-in).
 */
export const backfillProfileNames = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);

    const { data: blankProfiles, error: lookupError } = await context.supabase
      .from("profiles")
      .select("id")
      .or("full_name.is.null,full_name.eq.");
    if (lookupError) throw new Error(lookupError.message);
    if (!blankProfiles?.length) return { fixed: 0 };

    const { clerkClient } = await import("@clerk/tanstack-react-start/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const clerk = clerkClient();

    let fixed = 0;
    for (const { id } of blankProfiles) {
      const user = await clerk.users.getUser(id).catch(() => null);
      if (!user) continue;

      const metadataFullName =
        typeof user.unsafeMetadata?.full_name === "string"
          ? user.unsafeMetadata.full_name.trim()
          : "";
      const nativeFullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
      const fullName = metadataFullName || nativeFullName;
      if (!fullName) continue;

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", id);
      if (!updateError) fixed += 1;
    }

    return { fixed };
  });
