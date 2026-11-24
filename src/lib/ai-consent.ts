import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/tanstack-react-start";
import { useSession } from "@/lib/session";
import { toast } from "@/lib/toast";
import { clearCounsellorDataForUser } from "@/components/app/counsellor/storage";
import { getClerkSessionToken, requireClerkApiHeaders } from "@/lib/clerk-browser-token";
import { supabase } from "@/integrations/supabase/client";

// The assistant and AI-assisted drafting send what the person types to Anthropic.
// Consent is stored on profiles.ai_consent_at (server-enforced) and cached in localStorage.
const storageKey = (userId: string) => `lf.ai-consent.${userId}`;
const queryKey = (userId: string | undefined) => ["ai-consent", userId] as const;

type ConsentPayload = { ok?: boolean; allowed: boolean; at?: string | null };

function consentSetupError(message: string): string | null {
  if (/ai_consent_at|schema cache|column/i.test(message)) {
    return "AI consent isn't set up on the database yet. In Supabase → SQL Editor, run: ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_consent_at TIMESTAMPTZ;";
  }
  return null;
}

async function readConsent(userId: string): Promise<boolean> {
  try {
    await getClerkSessionToken();
    const { data, error } = await supabase
      .from("profiles")
      .select("ai_consent_at")
      .eq("id", userId)
      .maybeSingle();
    if (!error && data?.ai_consent_at) {
      try {
        window.localStorage.setItem(storageKey(userId), data.ai_consent_at);
      } catch {
        // ignore
      }
      return true;
    }
    if (error) {
      const setup = consentSetupError(error.message);
      if (setup) console.warn("[ai-consent]", setup);
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

async function postConsentApi(allowed: boolean): Promise<ConsentPayload> {
  const post = async () =>
    fetch("/api/mobile/ai-consent", {
      method: "POST",
      credentials: "include",
      headers: await requireClerkApiHeaders({
        "Content-Type": "application/json",
        Accept: "application/json",
      }),
      body: JSON.stringify({ allowed }),
    });

  let response = await post();
  if (response.status === 401) {
    // Cookie / JWT lag — refresh Bearer and retry once (same as Counsellor stream / ImageKit).
    response = await post();
  }

  const payload = (await response.json().catch(() => null)) as
    | (ConsentPayload & { error?: undefined })
    | { error: string }
    | null;

  if (!response.ok) {
    const message =
      payload && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "Could not save AI permission. Please try again.";
    const setup = consentSetupError(message);
    if (setup) throw new Error(setup);
    if (response.status === 401 || /clerk session|unauthorized/i.test(message)) {
      throw new Error("Please sign in again to continue.");
    }
    throw new Error(message);
  }

  return {
    allowed: Boolean(payload && "allowed" in payload ? payload.allowed : allowed),
    at: payload && "at" in payload ? (payload.at ?? null) : null,
  };
}

/**
 * Save consent via authenticated API first (service role). Client RLS is a fallback — right
 * after sign-in the JWT can lag and a cookie-only serverFn used to throw
 * "Unauthorized: No active Clerk session".
 */
async function persistConsent(userId: string, allowed: boolean): Promise<ConsentPayload> {
  const stamp = allowed ? new Date().toISOString() : null;

  try {
    const viaApi = await postConsentApi(allowed);
    return { allowed: viaApi.allowed, at: viaApi.at ?? stamp };
  } catch (apiError) {
    if (apiError instanceof Error) {
      const setup = consentSetupError(apiError.message);
      if (setup) throw new Error(setup);
      if (/please sign in again/i.test(apiError.message)) {
        // Fall through to RLS only if we still have a usable JWT for Supabase.
        const token = await getClerkSessionToken();
        if (!token) throw apiError;
      } else {
        // Unexpected API failure — still try RLS before surfacing.
      }
    }
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ ai_consent_at: stamp })
    .eq("id", userId)
    .select("ai_consent_at")
    .maybeSingle();

  if (!error && data) {
    return { allowed, at: data.ai_consent_at ?? stamp };
  }
  if (error) {
    const setup = consentSetupError(error.message);
    if (setup) throw new Error(setup);
  }

  throw new Error(
    error?.message || "Could not save AI permission. Please try again in a moment.",
  );
}

export function useAiConsent() {
  const { isLoaded, isSignedIn, userId: authUserId } = useAuth();
  const { user, loading: sessionLoading } = useSession();
  // Prefer session id; fall back to useAuth so consent isn't stuck while clerkUser hydrates.
  const userId = user?.id ?? authUserId ?? undefined;
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
      const result = await persistConsent(userId, allowed);
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

  const signedIn = Boolean(isSignedIn || userId);
  // Stay on the skeleton while Clerk says signed-in but the id hasn't attached yet — never flash
  // "Sign in to use Counsellor AI" for Solomon mid-hydrate.
  const waitingForId = signedIn && !userId;

  return {
    loading: !isLoaded || sessionLoading || waitingForId || (Boolean(userId) && stored.isLoading),
    allowed: stored.data === true,
    ready: Boolean(userId) && !stored.isLoading,
    allow: () => set(true),
    withdraw: () => set(false),
  };
}
