import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "./secure-store";
import { useSession } from "./session";
import { supabase } from "./supabase";
import { clearCounsellorDataForUser } from "./counsellor-storage";

// Consent is stored on profiles.ai_consent_at (server-enforced) and cached on-device.
const storageKey = (userId: string) => `lf.ai-consent.${userId}`;
const queryKey = (userId: string | undefined) => ["ai-consent", userId] as const;

async function readConsent(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("ai_consent_at")
    .eq("id", userId)
    .maybeSingle();
  if (data?.ai_consent_at) {
    await SecureStore.setItemAsync(storageKey(userId), data.ai_consent_at);
    return true;
  }
  return false;
}

export function useAiConsent() {
  const { user } = useSession();
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
    if (allowed && stamp) await SecureStore.setItemAsync(storageKey(userId), stamp);
    else {
      await SecureStore.deleteItemAsync(storageKey(userId));
      await clearCounsellorDataForUser(userId);
    }
    queryClient.setQueryData(queryKey(userId), allowed);
  };

  return {
    loading: !userId || stored.isLoading,
    allowed: stored.data === true,
    allow: () => set(true),
    withdraw: () => set(false),
  };
}
