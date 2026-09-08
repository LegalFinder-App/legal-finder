export type RuntimeEnv = Record<string, string | undefined>;

// Merges process.env (server/SSR runtime vars) under import.meta.env (Vite's build-time-replaced
// VITE_* vars) so callers that don't pass an explicit env see both. An explicitly passed env
// object is used as-is — it must NOT silently fall back to the real process.env per key, or a
// caller that intentionally builds a curated subset (e.g. omitting a secret key) would still leak
// that secret through the fallback.
function defaultRuntimeEnv(): RuntimeEnv {
  const processEnv = typeof process !== "undefined" ? (process.env as RuntimeEnv) : {};
  const viteEnv = typeof import.meta !== "undefined" ? (import.meta.env as RuntimeEnv) : {};
  return { ...processEnv, ...viteEnv };
}

export function readEnvValue(env: RuntimeEnv, key: string): string | undefined {
  return env[key];
}

export function getMissingEnvVars(
  env: RuntimeEnv = defaultRuntimeEnv(),
  requiredKeys: string[],
): string[] {
  return requiredKeys.filter((key) => !readEnvValue(env, key)?.trim());
}

export function resolveSupabaseConfig(env: RuntimeEnv = defaultRuntimeEnv()) {
  return {
    url: readEnvValue(env, "VITE_SUPABASE_URL") ?? readEnvValue(env, "SUPABASE_URL") ?? "",
    anonKey:
      readEnvValue(env, "VITE_SUPABASE_PUBLISHABLE_KEY") ??
      readEnvValue(env, "SUPABASE_PUBLISHABLE_KEY") ??
      "",
    serviceRoleKey:
      readEnvValue(env, "SUPABASE_SERVICE_ROLE_KEY") ??
      readEnvValue(env, "VITE_SUPABASE_SERVICE_ROLE_KEY") ??
      "",
  };
}
