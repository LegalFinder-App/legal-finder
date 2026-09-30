// EXPO_PUBLIC_* values are inlined at bundle time (like the web app's VITE_* vars), so they're
// public by construction — never put a secret here. Secrets stay on the web server, reached
// through the /api/mobile/* endpoints in lib/api.ts.

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy apps/mobile/.env.example to apps/mobile/.env and fill it in.`,
    );
  }
  return value;
}

export const env = {
  clerkPublishableKey: required(
    "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY",
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  ),
  supabaseUrl: required("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: required(
    "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
  // Canonical host only — the bare domain 308-redirects, and a redirect would turn a POST
  // into a GET on some clients.
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? "https://www.legalfinder.co").replace(/\/$/, ""),
  liveTrialRoomBase: (
    process.env.EXPO_PUBLIC_LIVE_TRIAL_ROOM_BASE_URL ?? "https://meet.jit.si"
  ).replace(/\/$/, ""),
};
