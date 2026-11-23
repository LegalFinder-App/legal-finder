import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import { clearCounsellorDataForUser } from "@/components/app/counsellor/storage";
import { getAiConsent, setAiConsent } from "@/lib/ai-consent.functions";

// The assistant and AI-assisted drafting send what the person types to Anthropic.
// Consent is stored on profiles.ai_consent_at (server-enforced) and cached in localStorage.
const storageKey = (userId: string) => `lf.ai-consent.${userId}`;
const queryKey = (userId: string | undefined) => ["ai-consent", userId] as const;

async function readConsent(userId: string): Promise<boolean> {
  try {
    const result = await getAiConsent();
    if (result.allowed && result.at) {
      try {
        window.localStorage.setItem(storageKey(userId), result.at);
      } catch {
        // ignore
      }
      return true;
    }
  } catch (error) {
    console.error("[ai-consent]", error);
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
    if (!userId) {
      toast.error("Please sign in again to continue.");
      return false;
    }
    try {
      const result = await setAiConsent({ data: { allowed } });
      try {
        if (allowed && result.at) window.localStorage.setItem(storageKey(userId), result.at);
        else {
          window.localStorage.removeItem(storageKey(userId));
          clearCounsellorDataForUser(userId);
        }
      } catch {
        // query cache below still updates
      }
      queryClient.setQueryData(queryKey(userId), allowed);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save AI permission. Please try again.";
      toast.error(message);
      console.error("[ai-consent]", message);
      return false;
    }
  };

  return {
    loading: sessionLoading || (Boolean(userId) && stored.isLoading),
    allowed: stored.data === true,
    ready: Boolean(userId) && !stored.isLoading,
    allow: () => set(true),
    withdraw: () => set(false),
  };
}
