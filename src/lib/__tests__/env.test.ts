import { describe, expect, it } from "vitest";
import { getMissingEnvVars, resolveSupabaseConfig } from "../env";

describe("environment validation", () => {
  it("flags missing env keys", () => {
    expect(
      getMissingEnvVars({ VITE_SUPABASE_URL: "", VITE_SUPABASE_PUBLISHABLE_KEY: "abc" }, [
        "VITE_SUPABASE_URL",
        "VITE_SUPABASE_PUBLISHABLE_KEY",
      ]),
    ).toEqual(["VITE_SUPABASE_URL"]);
  });

  it("normalizes Supabase config from either Vite or server env names", () => {
    expect(
      resolveSupabaseConfig({
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "anon-key",
        SUPABASE_URL: "https://fallback.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "fallback-key",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
      serviceRoleKey: "",
    });
  });
});
