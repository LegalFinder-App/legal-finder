export type RuntimeEnv = Record<string, string | undefined>;

export function readEnvValue(
  env: RuntimeEnv = typeof import.meta !== "undefined" ? (import.meta.env as RuntimeEnv) : {},
  key: string,
): string | undefined {
  return env[key] ?? process.env?.[key] ?? undefined;
}

export function getMissingEnvVars(
  env: RuntimeEnv = typeof import.meta !== "undefined" ? (import.meta.env as RuntimeEnv) : {},
  requiredKeys: string[],
): string[] {
  return requiredKeys.filter((key) => !readEnvValue(env, key)?.trim());
}

export function resolveSupabaseConfig(
  env: RuntimeEnv = typeof import.meta !== "undefined" ? (import.meta.env as RuntimeEnv) : {},
) {
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
