import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const registerSchema = z.object({
  token: z.string().regex(/^Expo(nent)?PushToken\[[^\]]+\]$/, "Invalid push token."),
  platform: z.enum(["ios", "android"]),
  deviceName: z.string().max(120).nullable().optional(),
});

// Tokens are written with the service role: a device token must follow whoever signed in last on
// that phone, which RLS (own rows only) couldn't reassign from the previous user.
export const Route = createFileRoute("/api/mobile/push/register")({
  server: {
    handlers: {
      POST: async (ctx) => {
        const { mobilePost } = await import("@/lib/mobile-api.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        return mobilePost(registerSchema, async ({ userId }, body) => {
          const { error } = await supabaseAdmin.from("device_push_tokens").upsert(
            {
              token: body.token,
              user_id: userId,
              platform: body.platform,
              device_name: body.deviceName ?? null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "token" },
          );
          if (error) throw new Error(error.message);
          return { ok: true as const };
        })(ctx);
      },
    },
  },
});
