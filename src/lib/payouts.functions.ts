import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireClerkAuth } from "@/integrations/supabase/auth-middleware";
import type { AppDatabase } from "@/integrations/supabase/app-database";

const retrySchema = z.object({ paymentId: z.string().uuid() });

/** Same pattern as src/lib/admin-users.functions.ts — checks the role explicitly, not RLS. */
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

/**
 * Manual safety net for the automatic payout that fires from pesapal.server.ts's
 * finalizePayment: re-attempts a payment whose payout is 'pending' (lawyer hadn't set up
 * payout details yet at the time) or 'failed' (a transient Flutterwave error).
 */
export const retryLawyerPayout = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .validator(retrySchema)
  .handler(async ({ context, data }) => {
    await requireAdmin(context);

    const { attemptLawyerPayout } = await import("@/lib/payouts.server");
    await attemptLawyerPayout(data.paymentId);
  });
