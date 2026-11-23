import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { clearCounsellorDataForUser } from "@/components/app/counsellor/storage";

// The assistant and AI-assisted drafting send what the person types to Anthropic.
// Consent is stored on profiles.ai_consent_at (server-enforced) and cached in localStorage.
const storageKey = (userId: string) => `lf.ai-consent.${userId}`;
const queryKey = (userId: string | undefined) => ["ai-consent", userId] as const;

async function readConsent(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("ai_consent_at")
    .eq("id", userId)
    .maybeSingle();
  if (data?.ai_consent_at) {
    try {
      window.localStorage.setItem(storageKey(userId), data.ai_consent_at);
    } catch {
      // ignore
    }
    return true;
  }
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
  return false;
}

export function useAiConsent() {
  const { user, loading: sessionLoading } = useSession();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const stored = useQuery({
    queryKey: queryKey(userId),
    enabled: Boolean(userId),
    staleTime: 30_000,
    queryFn: () => readConsent(userId as string),
  });

  const set = async (allowed: boolean) => {
    if (!userId) return;
    const stamp = allowed ? new Date().toISOString() : null;
    const { error } = await supabase
      .from("profiles")
      .update({ ai_consent_at: stamp })
      .eq("id", userId);
    if (error) {
      console.error("[ai-consent]", error.message);
      return;
    }
    try {
      if (allowed && stamp) window.localStorage.setItem(storageKey(userId), stamp);
      else {
        window.localStorage.removeItem(storageKey(userId));
        clearCounsellorDataForUser(userId);
      }
    } catch {
      // query cache below still updates
    }
    queryClient.setQueryData(queryKey(userId), allowed);
  };

  return {
    loading: sessionLoading || (Boolean(userId) && stored.isLoading),
    allowed: stored.data === true,
    ready: Boolean(userId) && !stored.isLoading,
    allow: () => void set(true),
    withdraw: () => void set(false),
  };
}
