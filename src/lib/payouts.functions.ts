import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireClerkAuth } from "@/integrations/supabase/auth-middleware";

// Also used by /api/mobile/payouts/retry to validate the app's requests identically.
export const retryPayoutSchema = z.object({ paymentId: z.string().uuid() });

/**
 * Manual safety net for the automatic payout that fires from pesapal.server.ts's
 * finalizePayment: re-attempts a payment whose payout is 'pending' (lawyer hadn't set up
 * payout details yet at the time) or 'failed' (a transient Flutterwave error). The admin check
 * and the payout live in payouts.server.ts (dynamically imported — route/functions files are
 * dual-purpose, so server-only deps must not load at module scope).
 */
export const retryLawyerPayout = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .validator(retryPayoutSchema)
  .handler(async ({ context, data }) => {
    const { retryLawyerPayoutAsAdmin } = await import("@/lib/payouts.server");
    return retryLawyerPayoutAsAdmin(context, data.paymentId);
  });
