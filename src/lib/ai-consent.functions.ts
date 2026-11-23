import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireClerkAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const setSchema = z.object({
  allowed: z.boolean(),
});

function consentDbError(message: string): Error {
  if (/ai_consent_at|schema cache|column/i.test(message)) {
    return new Error(
      "AI consent isn't set up on the database yet. In Supabase → SQL Editor, run: ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_consent_at TIMESTAMPTZ;",
    );
  }
  return new Error(message || "Could not save AI permission.");
}

/** Persist Counsellor / drafting consent on profiles.ai_consent_at (service role). */
export const setAiConsent = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .validator(setSchema)
  .handler(async ({ context, data }) => {
    const stamp = data.allowed ? new Date().toISOString() : null;
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ ai_consent_at: stamp })
      .eq("id", context.userId);
    if (error) throw consentDbError(error.message);
    return { ok: true as const, allowed: data.allowed, at: stamp };
  });

/** Read whether this account has granted AI consent. */
export const getAiConsent = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("ai_consent_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw consentDbError(error.message);
    return { allowed: Boolean(data?.ai_consent_at), at: data?.ai_consent_at ?? null };
  });
