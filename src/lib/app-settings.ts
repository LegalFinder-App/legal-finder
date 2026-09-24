import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  id: string;
  maintenance_mode: boolean;
  incident_reporting_enabled: boolean;
  wanted_notices_enabled: boolean;
  ai_assistant_enabled: boolean;
  updated_at: string;
  updated_by: string | null;
}

// Written before `supabase gen types` has ever seen the app_settings table (added in
// 20260909130000_app_settings.sql) — narrowed here the same way mutations.ts narrows untypedClient,
// instead of waiting on a generated-types regen to unblock this module.
const settingsClient = supabase as unknown as {
  from: (table: "app_settings") => {
    select: (columns: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        single: () => Promise<{ data: AppSettings | null; error: { message: string } | null }>;
      };
    };
    update: (values: Partial<AppSettings>) => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

const FALLBACK_SETTINGS: AppSettings = {
  id: "global",
  maintenance_mode: false,
  incident_reporting_enabled: true,
  wanted_notices_enabled: true,
  ai_assistant_enabled: true,
  updated_at: new Date(0).toISOString(),
  updated_by: null,
};

export const appSettingsQuery = queryOptions({
  queryKey: ["app-settings"],
  queryFn: async (): Promise<AppSettings> => {
    const { data, error } = await settingsClient
      .from("app_settings")
      .select("*")
      .eq("id", "global")
      .single();
    if (error) throw new Error(error.message);
    // Row always exists (seeded by migration) — fallback only guards a pre-migration environment.
    return data ?? FALLBACK_SETTINGS;
  },
  staleTime: 60_000,
});

export async function updateAppSettings(
  patch: Partial<Omit<AppSettings, "id" | "updated_at" | "updated_by">>,
  updatedBy: string,
): Promise<void> {
  const { error } = await settingsClient
    .from("app_settings")
    .update({ ...patch, updated_at: new Date().toISOString(), updated_by: updatedBy })
    .eq("id", "global");
  if (error) throw new Error(error.message);
}
