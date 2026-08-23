import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "vdwgohwlawsykvbynasp";
const MCP_URL = `https://mcp.supabase.com/mcp?project_ref=${PROJECT_REF}&features=database`;
const TOKEN_SCRIPT = join(process.cwd(), "scripts", "read-supabase-token.ps1");

function readCliToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
    return process.env.SUPABASE_ACCESS_TOKEN.trim();
  }

  const tempDir = mkdtempSync(join(tmpdir(), "supabase-token-"));
  const tokenFile = join(tempDir, "token.txt");

  try {
    execFileSync(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", TOKEN_SCRIPT, tokenFile],
      { stdio: "pipe", encoding: "utf8" },
    );
    const token = readFileSync(tokenFile, "utf8").trim();
    if (!token) {
      throw new Error("empty token");
    }
    return token;
  } catch {
    throw new Error(
      [
        "Could not read a Supabase access token.",
        "Fix one of the following, then retry:",
        "  1) Run: supabase login",
        "  2) Or set SUPABASE_ACCESS_TOKEN in your environment",
        "     (create one at https://supabase.com/dashboard/account/tokens)",
      ].join("\n"),
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function parseMcpPayload(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }

  const dataLines = text
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim());

  if (dataLines.length === 0) {
    throw new Error(`Unrecognized MCP response:\n${text.slice(0, 500)}`);
  }

  return JSON.parse(dataLines.at(-1));
}

async function mcpCall(token, sessionId, id, method, params = undefined) {
  const body = JSON.stringify({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) });
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;

  const response = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`MCP HTTP ${response.status}: ${text.slice(0, 500)}`);
  }

  const payload = parseMcpPayload(text);
  if (payload.error) {
    throw new Error(`${method} failed: ${JSON.stringify(payload.error)}`);
  }

  return {
    result: payload.result,
    sessionId: response.headers.get("mcp-session-id") ?? sessionId,
  };
}

function unwrapToolResult(result) {
  if (!result) return result;
  if (result.isError) {
    const message = (result.content ?? [])
      .map((part) => part?.text ?? "")
      .join("\n");
    throw new Error(message || "MCP tool returned an error");
  }
  if (Array.isArray(result.content)) {
    const text = result.content
      .filter((part) => part?.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("\n");
    if (text) {
      const parsed = JSON.parse(text);
      if (parsed?.error) {
        throw new Error(parsed.error.message ?? JSON.stringify(parsed.error));
      }
      return parsed;
    }
  }
  return result;
}

function migrationName(filename) {
  return filename.replace(/\.sql$/i, "").replace(/^\d+_/, "").replace(/-/g, "_");
}

async function main() {
  const token = readCliToken();
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  console.log(`Project: ${PROJECT_REF}`);
  console.log(`Migrations: ${files.length}`);

  let session = (
    await mcpCall(token, null, 1, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "legalfinder-migration-script", version: "1.0.0" },
    })
  ).sessionId;

  const existing = unwrapToolResult(
    (await mcpCall(token, session, 3, "tools/call", {
      name: "list_migrations",
      arguments: {},
    })).result,
  );
  const applied = new Set(
    (existing?.migrations ?? existing?.content ?? [])
      .flatMap((entry) => {
        if (typeof entry === "string") return [entry];
        if (entry?.name) return [entry.name];
        if (entry?.version) return [entry.version];
        return [];
      }),
  );

  console.log(`Already applied: ${applied.size}`);

  for (const [index, file] of files.entries()) {
    const name = migrationName(file);
    if (applied.has(name) || applied.has(file)) {
      console.log(`Skip ${file} (already applied)`);
      continue;
    }

    const query = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`Applying ${file} ...`);
    await mcpCall(token, session, 10 + index, "tools/call", {
      name: "apply_migration",
      arguments: { name, query },
    });
    console.log(`Applied ${file}`);
  }

  const final = unwrapToolResult(
    (await mcpCall(token, session, 99, "tools/call", {
      name: "list_tables",
      arguments: { schemas: ["public"] },
    })).result,
  );

  const tablesResult = final?.tables ?? final;
  const tableCount = Array.isArray(tablesResult) ? tablesResult.length : "unknown";
  console.log(`Done. Public tables: ${tableCount}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("permission to perform this action")) {
    console.error(
      [
        message,
        "",
        "Your Supabase CLI token does not have access to this project.",
        "Run `supabase login` with the account that owns",
        `project ${PROJECT_REF}, then retry npm run db:migrate.`,
      ].join("\n"),
    );
  } else {
    console.error(message);
  }
  process.exit(1);
});
