import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "./secure-store";
import { useSession } from "./session";

// The assistant and AI-assisted drafting send what the person types to Anthropic (through our
// server — src/lib/assistant.server.ts and document-drafting.server.ts on the website). App
// Store guideline 5.1.2(i) requires saying which third-party AI receives it and getting a clear
// yes first, and our privacy policy names consent as the basis for these features. The answer is
// kept per account on this device; the Settings switch withdraws it.
const storageKey = (userId: string) => `lf.ai-consent.${userId}`;
const queryKey = (userId: string | undefined) => ["ai-consent", userId] as const;

export function useAiConsent() {
  const { user } = useSession();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const stored = useQuery({
    queryKey: queryKey(userId),
    enabled: Boolean(userId),
    staleTime: Infinity,
    queryFn: async () => (await SecureStore.getItemAsync(storageKey(userId as string))) !== null,
  });

  const set = async (allowed: boolean) => {
    if (!userId) return;
    // The stored value is the time of the yes, in case it is ever needed as a record.
    if (allowed) await SecureStore.setItemAsync(storageKey(userId), new Date().toISOString());
    else await SecureStore.deleteItemAsync(storageKey(userId));
    queryClient.setQueryData(queryKey(userId), allowed);
  };

  return {
    loading: !userId || stored.isLoading,
    allowed: stored.data === true,
    allow: () => set(true),
    withdraw: () => set(false),
  };
}
