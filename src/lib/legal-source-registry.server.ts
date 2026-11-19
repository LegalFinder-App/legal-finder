// Server-only. Phase 0 catalogue of ingestible / citable Uganda legal sources.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { LegalSourceRegistryRow } from "@/integrations/supabase/app-database";

/** Sources we may embed in Phase 1 (full text hosted under a clear licence). */
export async function listRagEligibleSources(): Promise<LegalSourceRegistryRow[]> {
  const { data, error } = await supabaseAdmin
    .from("legal_source_registry")
    .select("*")
    .eq("host_policy", "host_full_text")
    .eq("api_status", "active")
    .order("slug");
  if (error) throw new Error(`legal_source_registry: ${error.message}`);
  return data ?? [];
}

/** ULII / pending rows — never treat as scrape targets. */
export async function listPendingLicenceSources(): Promise<LegalSourceRegistryRow[]> {
  const { data, error } = await supabaseAdmin
    .from("legal_source_registry")
    .select("*")
    .eq("api_status", "pending_licence")
    .order("slug");
  if (error) throw new Error(`legal_source_registry: ${error.message}`);
  return data ?? [];
}

export async function getSourceBySlug(slug: string): Promise<LegalSourceRegistryRow | null> {
  const { data, error } = await supabaseAdmin
    .from("legal_source_registry")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`legal_source_registry: ${error.message}`);
  return data;
}

export async function touchSourceSync(
  slug: string,
  input: { checksum?: string | null; ok: boolean },
) {
  const now = new Date().toISOString();
  const patch: {
    last_synced_at: string;
    last_success_at?: string;
    content_checksum?: string | null;
  } = {
    last_synced_at: now,
  };
  if (input.ok) patch.last_success_at = now;
  if (input.checksum !== undefined) patch.content_checksum = input.checksum;
  const { error } = await supabaseAdmin
    .from("legal_source_registry")
    .update(patch)
    .eq("slug", slug);
  if (error) throw new Error(`legal_source_registry touch: ${error.message}`);
}
