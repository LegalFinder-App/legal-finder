// Clerk's browser runtime (loaded by ClerkProvider) attaches itself to `window.Clerk` — a
// documented escape hatch for reading the current session outside of React hooks. Used by
// src/integrations/supabase/client.ts, whose `supabase` export is a plain module-level
// singleton (not a hook), so it can't call useSession() itself.
export {};

declare global {
  interface Window {
    Clerk?: {
      loaded: boolean;
      load(): Promise<unknown>;
      session?: {
        getToken(): Promise<string | null>;
      } | null;
    };
  }
}
