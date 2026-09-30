import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import type { AppDatabase } from "@/types/app-database";
import { env } from "./env";
import { getAuthToken } from "./auth-token";

// Same Clerk third-party-auth setup as the web client (src/integrations/supabase/client.ts):
// Supabase verifies the Clerk session JWT directly, so RLS policies see auth.jwt()->>'sub' as
// the Clerk user id. Setting `accessToken` disables supabase-js's own auth namespace entirely.
export const supabase = createClient<AppDatabase>(env.supabaseUrl, env.supabasePublishableKey, {
  accessToken: getAuthToken,
  global: {
    fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      // New sb_publishable_ keys are opaque, not bearer JWTs — only ever send them as `apikey`.
      if (headers.get("Authorization") === `Bearer ${env.supabasePublishableKey}`) {
        headers.delete("Authorization");
      }
      headers.set("apikey", env.supabasePublishableKey);
      return fetch(input, { ...init, headers });
    },
  },
});

export function unwrap<T>({
  data,
  error,
}: {
  data: T | null;
  error: { message: string } | null;
}): T {
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}
