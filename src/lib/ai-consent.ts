import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/session";

// The assistant and AI-assisted drafting send what the person types to Anthropic
// (assistant.server.ts, document-drafting.server.ts). The privacy policy names consent as the
// basis for that, so both features ask first; the answer is kept per account in this browser
// and the Settings switch withdraws it. The apps do the same (apps/mobile/src/lib/ai-consent.ts),
// where App Store guideline 5.1.2(i) requires it.
const storageKey = (userId: string) => `lf.ai-consent.${userId}`;
const queryKey = (userId: string | undefined) => ["ai-consent", userId] as const;

// Private browsing and blocked storage throw; then the yes simply lasts for this visit.
function read(userId: string) {
  try {
    return window.localStorage.getItem(storageKey(userId)) !== null;
  } catch {
    return false;
  }
}

export function useAiConsent() {
  const { user } = useSession();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const stored = useQuery({
    queryKey: queryKey(userId),
    enabled: Boolean(userId),
    staleTime: Infinity,
    queryFn: () => read(userId as string),
  });

  const set = (allowed: boolean) => {
    if (!userId) return;
    try {
      // The stored value is the time of the yes, in case it is ever needed as a record.
      if (allowed) window.localStorage.setItem(storageKey(userId), new Date().toISOString());
      else window.localStorage.removeItem(storageKey(userId));
    } catch {
      // kept for this visit by the query cache below
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
