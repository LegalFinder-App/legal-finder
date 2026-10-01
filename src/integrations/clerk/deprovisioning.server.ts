// Server-only. Mirrors provisioning.server.ts's shape but runs the opposite direction: removes
// the Clerk account and its Supabase profile/role rows together, so a deleted user can't be
// silently resurrected by ensureProfileProvisioned() on their next authenticated request.
// Historical records that reference the user's id (cases, messages, documents, audit_logs, ...)
// are intentionally left in place — Clerk id columns no longer carry an ON DELETE CASCADE FK
// (dropped in the Clerk auth migration), and purging case/audit history is a separate, much
// bigger data-retention decision than "remove this account from Users & Roles".
import { clerkClient } from "@clerk/tanstack-react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function deprovisionUser(userId: string): Promise<void> {
  await clerkClient().users.deleteUser(userId);

  const { error: rolesError } = await supabaseAdmin
    .from("user_roles")
    .delete()
    .eq("user_id", userId);
  if (rolesError) throw new Error(rolesError.message);

  const { error: profileError } = await supabaseAdmin.from("profiles").delete().eq("id", userId);
  if (profileError) throw new Error(profileError.message);

  // Stop pushes to the deleted account's phones. Best-effort: the table only exists once the
  // mobile push migration is applied, and a leftover token must never block the deletion.
  const { error: tokensError } = await supabaseAdmin
    .from("device_push_tokens")
    .delete()
    .eq("user_id", userId);
  if (tokensError) console.warn("[deprovision] push tokens not removed:", tokensError.message);
}
