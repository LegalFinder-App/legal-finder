#!/usr/bin/env node
// Copies publishable keys from the website's root .env into apps/mobile/.env.
// Never copies secrets (Clerk secret, service role, Anthropic, Pesapal, etc.).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const rootEnv = join(here, "..", "..", "..", ".env");
const mobileEnv = join(here, "..", ".env");

if (!existsSync(rootEnv)) {
  console.error(`Missing ${rootEnv}. Create the website .env first.`);
  process.exit(1);
}

const raw = readFileSync(rootEnv, "utf8");
const get = (key) => {
  const m = raw.match(new RegExp(`^${key}=\\s*"?([^"\\n]*)"?\\s*$`, "m"));
  return m?.[1]?.trim() || "";
};

const clerk = get("VITE_CLERK_PUBLISHABLE_KEY");
const supabaseUrl = get("VITE_SUPABASE_URL") || get("SUPABASE_URL");
const supabaseKey = get("VITE_SUPABASE_PUBLISHABLE_KEY") || get("SUPABASE_PUBLISHABLE_KEY");
const apiUrl = (get("VITE_APP_URL") || "https://www.legalfinder.co")
  .replace(/\/$/, "")
  .replace(/^https:\/\/legalfinder\.co$/i, "https://www.legalfinder.co");

if (!clerk || !supabaseUrl || !supabaseKey) {
  console.error("Root .env is missing VITE_CLERK_PUBLISHABLE_KEY / VITE_SUPABASE_*.");
  process.exit(1);
}

const out = `# Synced from repo-root .env via scripts/sync-env-from-web.mjs
# Publishable keys only — never put server secrets in this file.

EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=${clerk}
EXPO_PUBLIC_SUPABASE_URL=${supabaseUrl}
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${supabaseKey}
EXPO_PUBLIC_API_URL=${apiUrl}
`;

writeFileSync(mobileEnv, out);
console.log(`Wrote ${mobileEnv}`);
