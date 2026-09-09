import { createServerFn } from "@tanstack/react-start";
import { requireClerkAuth } from "@/integrations/supabase/auth-middleware";

/** Self-service account deletion from the personal Settings page — no role check needed since
 * context.userId is always the caller's own id, unlike admin-users.functions.ts's admin-only path. */
export const deleteOwnAccount = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }) => {
    const { deprovisionUser } = await import("@/integrations/clerk/deprovisioning.server");
    await deprovisionUser(context.userId);
  });
