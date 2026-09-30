// Copies the web app's Supabase types into the mobile app. Metro can't import from outside the
// app folder without extra config, and both apps must agree on the schema, so the web copy is
// the single source of truth — run `npm run sync-types` after any migration.
import { copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webTypes = join(here, "..", "..", "..", "src", "integrations", "supabase");
const mobileTypes = join(here, "..", "src", "types");

for (const file of ["types.ts", "app-database.ts"]) {
  copyFileSync(join(webTypes, file), join(mobileTypes, file));
  console.log(`synced ${file}`);
}
