// Server-only. Mirrors provisioning.server.ts's shape but runs the opposite direction: removes
// the Clerk account and its Supabase profile/role rows together, so a deleted user can't be
// silently resurrected by ensureProfileProvisioned() on their next authenticated request.
// Historical records that reference the user's id (cases, messages, documents, audit_logs, ...)
// are intentionally left in place — Clerk id columns no longer carry an ON DELETE CASCADE FK
// (dropped in the Clerk auth migration), and purging case/audit history is a separate, much
// bigger data-retention decision than "remove this account from Users & Roles".
//
// What does go, besides the profile and roles, is what only makes sense while the account
// exists: an advocate's public directory listing (name, phone, email and bar number shown to
// everyone — its reviews and CPD records cascade with it), their payout details, the blocks they
// set or that name them, any application for an advocate, police or judiciary account with its
// identity documents, and the devices registered for push. Reports of abuse are kept, like the
// case and audit history. /delete-account and the privacy policy describe exactly this list, so
// change them together.
import { clerkClient } from "@clerk/tanstack-react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// lawyer_payout_accounts isn't in AppDatabase (see src/lib/lawyer-payout.ts).
const payoutAccounts = supabaseAdmin as unknown as {
  from: (table: "lawyer_payout_accounts") => {
    delete: () => {
      eq: (col: "lawyer_user_id", val: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

/** The identity documents in the private onboarding bucket, filed under <user id>/<application>/. */
async function removeApplicationFiles(userId: string): Promise<{ error: { message: string } | null }> {
  const { data, error } = await supabaseAdmin
    .from("role_application_documents")
    .select("storage_path")
    .eq("user_id", userId);
  if (error) return { error };
  if (!data?.length) return { error: null };
  const { error: removeError } = await supabaseAdmin.storage
    .from("onboarding")
    .remove(data.map((d) => d.storage_path));
  return { error: removeError };
}

export async function deprovisionUser(userId: string): Promise<void> {
  try {
    await clerkClient().users.deleteUser(userId);
  } catch (error) {
    // Already gone: an earlier attempt removed the sign-in and then failed below. Carry on, so
    // an administrator's retry can finish the cleanup instead of failing here forever.
    if ((error as { status?: number } | null)?.status !== 404) throw error;
  }

  // Every step runs even if an earlier one fails — the person can no longer sign in to try
  // again — and the first failure is reported once all of them have been attempted.
  const failures: string[] = [];
  const attempt = async (what: string, run: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await run;
    if (error) failures.push(`${what}: ${error.message}`);
  };

  await attempt("roles", supabaseAdmin.from("user_roles").delete().eq("user_id", userId));
  await attempt("profile", supabaseAdmin.from("profiles").delete().eq("id", userId));
  await attempt("directory listing", supabaseAdmin.from("lawyers").delete().eq("user_id", userId));
  await attempt(
    "payout details",
    payoutAccounts.from("lawyer_payout_accounts").delete().eq("lawyer_user_id", userId),
  );
  await attempt(
    "blocks",
    supabaseAdmin
      .from("user_blocks")
      .delete()
      .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
  );
  await attempt("application documents", removeApplicationFiles(userId));
  // Its document rows cascade with it.
  await attempt(
    "applications",
    supabaseAdmin.from("role_applications").delete().eq("user_id", userId),
  );
  await attempt(
    "browser push",
    supabaseAdmin.from("push_subscriptions").delete().eq("user_id", userId),
  );

  // Stop pushes to the deleted account's phones. Best-effort: the table only exists once the
  // mobile push migration is applied, and a leftover token must never block the deletion.
  const { error: tokensError } = await supabaseAdmin
    .from("device_push_tokens")
    .delete()
    .eq("user_id", userId);
  if (tokensError) console.warn("[deprovision] push tokens not removed:", tokensError.message);

  if (failures.length) {
    console.error("[deprovision] incomplete for", userId, failures);
    throw new Error(failures[0].slice(failures[0].indexOf(": ") + 2));
  }
}
