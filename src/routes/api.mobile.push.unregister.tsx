import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/api/mobile/push/unregister")({
  server: {
    handlers: {
      POST: async (ctx) => {
        const { mobilePost } = await import("@/lib/mobile-api.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        return mobilePost(z.object({ token: z.string().min(1) }), async ({ userId }, body) => {
          const { error } = await supabaseAdmin
            .from("device_push_tokens")
            .delete()
            .eq("token", body.token)
            .eq("user_id", userId);
          if (error) throw new Error(error.message);
          return { ok: true as const };
        })(ctx);
      },
    },
  },
});
