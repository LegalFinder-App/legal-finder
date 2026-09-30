import { createFileRoute } from "@tanstack/react-router";
import { initiateSchema } from "@/lib/payments.functions";

// Same checkout as the web; Pesapal returns to /api/pesapal/callback-mobile, which hands control
// back to the app via legalfinder://payment-result.
export const Route = createFileRoute("/api/mobile/payments/initiate")({
  server: {
    handlers: {
      POST: async (ctx) => {
        const { mobilePost } = await import("@/lib/mobile-api.server");
        const { startPesapalCheckout } = await import("@/lib/payments.server");
        return mobilePost(initiateSchema, ({ userId, supabase }, body) =>
          startPesapalCheckout({
            supabase,
            userId,
            paymentId: body.paymentId,
            callbackPath: "/api/pesapal/callback-mobile",
          }),
        )(ctx);
      },
    },
  },
});
