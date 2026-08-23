import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const combined = files
  .map((file) => {
    const sql = readFileSync(join(migrationsDir, file), "utf8").trim();
    return `-- >>> ${file}\n${sql}\n`;
  })
  .join("\n");

const output = join(process.cwd(), "scripts", "all-migrations.sql");
writeFileSync(output, combined, "utf8");
console.log(`Wrote ${files.length} migrations to ${output}`);
