import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { BadRequestError, mobilePost } from "@/lib/mobile-api.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const bodySchema = z.object({
  allowed: z.boolean(),
});

function consentDbError(message: string): Error {
  if (/ai_consent_at|schema cache|column/i.test(message)) {
    return new BadRequestError(
      "AI consent isn't set up on the database yet. Run migration 20261123130000_ai_consent.sql in the Supabase SQL Editor.",
    );
  }
  return new BadRequestError(message || "Could not save AI permission.");
}

export const Route = createFileRoute("/api/mobile/ai-consent")({
  server: {
    handlers: {
      POST: mobilePost(bodySchema, async ({ userId }, body) => {
        const stamp = body.allowed ? new Date().toISOString() : null;
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ ai_consent_at: stamp })
          .eq("id", userId);
        if (error) throw consentDbError(error.message);
        return { ok: true, allowed: body.allowed, at: stamp };
      }),
    },
  },
});
