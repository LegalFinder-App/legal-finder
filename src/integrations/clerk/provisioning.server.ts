// Server-only. Replaces the old handle_new_user() Postgres trigger, which fired on
// `AFTER INSERT ON auth.users` — Clerk-authenticated users never produce an auth.users row,
// so that trigger can never fire again. This does the same job (seed a `profiles` row and a
// default 'user' role) lazily, on the first authenticated request from a given Clerk user,
// called from both requireClerkAuth (serverFn calls) and _authenticated/route.tsx's beforeLoad
// (the first touchpoint for a page load).
import { clerkClient } from "@clerk/tanstack-react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const VALID_ROLES: readonly AppRole[] = ["user", "lawyer", "police", "judiciary", "admin"];

function parseRequestedRole(value: unknown): AppRole | null {
  return typeof value === "string" && (VALID_ROLES as readonly string[]).includes(value)
    ? (value as AppRole)
    : null;
}

export async function ensureProfileProvisioned(userId: string): Promise<void> {
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (existing) return;

  const user = await clerkClient().users.getUser(userId);
  const primaryEmail =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ?? null;
  // The password sign-up form (src/routes/auth.tsx) collects one "Full name" field into
  // unsafeMetadata.full_name — Clerk's native firstName/lastName are only populated by social
  // sign-in (e.g. Google), so that pair is only a fallback, not the primary source.
  const metadataFullName =
    typeof user.unsafeMetadata?.full_name === "string" ? user.unsafeMetadata.full_name.trim() : "";
  const nativeFullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const fullName = metadataFullName || nativeFullName;
  const requestedRole = parseRequestedRole(user.unsafeMetadata?.requested_role);

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      full_name: fullName,
      email: primaryEmail,
      requested_role: requestedRole,
    },
    { onConflict: "id" },
  );
  if (profileError) throw new Error(profileError.message);

  // Privileged roles always land here as a request only — handle_new_user() never auto-granted
  // them either, an admin approves via the existing admin UI. Everyone gets 'user' by default.
  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .upsert(
      { user_id: userId, role: "user" },
      { onConflict: "user_id,role", ignoreDuplicates: true },
    );
  if (roleError) throw new Error(roleError.message);
}
