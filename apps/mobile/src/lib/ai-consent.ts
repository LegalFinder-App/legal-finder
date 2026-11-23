import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "./secure-store";
import { useSession } from "./session";
import { apiPost } from "./api";
import { toast } from "./toast";
import { clearCounsellorDataForUser } from "./counsellor-storage";

// Consent is stored on profiles.ai_consent_at (server-enforced) and cached on-device.
const storageKey = (userId: string) => `lf.ai-consent.${userId}`;
const queryKey = (userId: string | undefined) => ["ai-consent", userId] as const;

type ConsentPayload = { allowed: boolean; at?: string | null };

async function readConsent(userId: string): Promise<boolean> {
  try {
    // Prefer server (source of truth). Fall back to GET via POST body-less isn't available —
    // profiles row is checked by asking the consent endpoint after a no-op isn't ideal, so we
    // also accept a light profile read through the session path: use set with allowed lookup.
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase
      .from("profiles")
      .select("ai_consent_at")
      .eq("id", userId)
      .maybeSingle();
    if (!error && data?.ai_consent_at) {
      await SecureStore.setItemAsync(storageKey(userId), data.ai_consent_at);
      return true;
    }
  } catch {
    // offline / missing column — treat as not consented
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
    if (!userId) {
      toast.error("Please sign in again to continue.");
      return false;
    }
    try {
      const result = await apiPost<ConsentPayload>("/api/mobile/ai-consent", { allowed });
      if (allowed && result.at) await SecureStore.setItemAsync(storageKey(userId), result.at);
      else {
        await SecureStore.deleteItemAsync(storageKey(userId));
        await clearCounsellorDataForUser(userId);
      }
      queryClient.setQueryData(queryKey(userId), allowed);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save AI permission. Please try again.";
      toast.error(message);
      return false;
    }
  };

  return {
    loading: !userId || stored.isLoading,
    allowed: stored.data === true,
    allow: () => set(true),
    withdraw: () => set(false),
  };
}
