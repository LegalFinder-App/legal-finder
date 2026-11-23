// Server-only. UI gates on AiConsentGate; Anthropic paths also require profiles.ai_consent_at.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export class AiConsentRequiredError extends Error {
  constructor() {
    super("Please allow Counsellor AI in Settings → Privacy before continuing.");
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
    throw new AiConsentRequiredError();
  }
  if (!data?.ai_consent_at) throw new AiConsentRequiredError();
}
