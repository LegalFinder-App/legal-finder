// Clerk's browser runtime (loaded by ClerkProvider) attaches itself to `window.Clerk` — a
// documented escape hatch for reading the current session outside of React hooks. Used by
// src/integrations/supabase/client.ts, whose `supabase` export is a plain module-level
// singleton (not a hook), so it can't call useSession() itself. Also used by the
// `_authenticated` beforeLoad fallback when the session cookie lags behind client sign-in.
export {};

declare global {
  interface Window {
    Clerk?: {
      loaded: boolean;
      load(): Promise<unknown>;
      user?: { id: string } | null;
      session?: {
        getToken(): Promise<string | null>;
        user?: { id: string } | null;
        status?: string;
      } | null;
    };
  }
}
