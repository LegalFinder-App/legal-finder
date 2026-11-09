import { createServerFn } from "@tanstack/react-start";
import { rateLimited } from "@/lib/rate-limit-middleware";

/** Self-service account deletion from the personal Settings page — no role check needed since
 * context.userId is always the caller's own id, unlike admin-users.functions.ts's admin-only path. */
export const deleteOwnAccount = createServerFn({ method: "POST" })
  .middleware([rateLimited("account")])
  .handler(async ({ context }) => {
    const { deprovisionUser } = await import("@/integrations/clerk/deprovisioning.server");
    await deprovisionUser(context.userId);
  });
