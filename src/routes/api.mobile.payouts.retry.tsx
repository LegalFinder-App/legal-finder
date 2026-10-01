import { createFileRoute } from "@tanstack/react-router";
import { retryPayoutSchema } from "@/lib/payouts.functions";

// The app's counterpart of "Retry" in the admin Payouts panel (retryLawyerPayout on the web).
export const Route = createFileRoute("/api/mobile/payouts/retry")({
  server: {
    handlers: {
      POST: async (ctx) => {
        const { mobilePost } = await import("@/lib/mobile-api.server");
        const { retryLawyerPayoutAsAdmin } = await import("@/lib/payouts.server");
        return mobilePost(retryPayoutSchema, (caller, body) =>
          retryLawyerPayoutAsAdmin(caller, body.paymentId),
        )(ctx);
      },
    },
  },
});
