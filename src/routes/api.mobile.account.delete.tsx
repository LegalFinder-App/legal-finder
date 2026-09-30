import { createFileRoute } from "@tanstack/react-router";

// In-app account deletion (required by Google Play and the App Store) — the same deprovisioning
// the web's Settings page runs via deleteOwnAccount.
export const Route = createFileRoute("/api/mobile/account/delete")({
  server: {
    handlers: {
      POST: async (ctx) => {
        const { mobilePost } = await import("@/lib/mobile-api.server");
        const { deprovisionUser } = await import("@/integrations/clerk/deprovisioning.server");
        return mobilePost(null, async ({ userId }) => {
          await deprovisionUser(userId);
          return { ok: true as const };
        })(ctx);
      },
    },
  },
});
