// Server-only. UI gates on AiConsentGate; Anthropic paths also require profiles.ai_consent_at.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export class AiConsentRequiredError extends Error {
  constructor(message = "Please allow Counsellor AI in Settings → Privacy before continuing.") {
    super(message);
    this.name = "AiConsentRequiredError";
  }
}

/** Throws AiConsentRequiredError when this account has not consented (or withdrew). */
export async function requireAiConsent(userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("ai_consent_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[ai-consent]", error.message);
    if (/ai_consent_at|schema cache|column/i.test(error.message)) {
      throw new AiConsentRequiredError(
        "AI consent isn't set up on the database yet. Run migration 20261123130000_ai_consent.sql in the Supabase SQL Editor, then try Allow and continue again.",
      );
    }
    throw new AiConsentRequiredError();
  }
  if (!data?.ai_consent_at) throw new AiConsentRequiredError();
}
