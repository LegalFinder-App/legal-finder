import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireClerkAuth } from "@/integrations/supabase/auth-middleware";
import type { AppDatabase } from "@/integrations/supabase/app-database";

async function requireAdmin(context: {
  supabase: SupabaseClient<AppDatabase>;
  userId: string;
}): Promise<void> {
  const { data: callerRoles, error: roleError } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (roleError) throw new Error(roleError.message);
  if (!callerRoles?.some((row) => row.role === "admin")) {
    throw new Error("Only administrators can do this.");
  }
}

/** Admin-only: re-index advice / judgments / library / live feed into legal_chunks. */
export const reindexLegalCorpus = createServerFn({ method: "POST" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { runLegalCorpusIndex } = await import("@/lib/legal-rag/index-corpus.server");
    return runLegalCorpusIndex();
  });

/** Admin-only: corpus + feed + registry health snapshot. */
export const loadLegalCorpusHealth = createServerFn({ method: "GET" })
  .middleware([requireClerkAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const kinds = ["advice", "judgment", "library", "news"] as const;
    const feedSources = ["judiciary", "upf", "ulii"] as const;

    const [chunkCounts, feedCounts, registry, feedSync] = await Promise.all([
      Promise.all(
        kinds.map(async (kind) => {
          const { count, error } = await supabaseAdmin
            .from("legal_chunks")
            .select("id", { count: "exact", head: true })
            .eq("source_kind", kind);
          if (error) throw new Error(error.message);
          return [kind, count ?? 0] as const;
        }),
      ),
      Promise.all(
        feedSources.map(async (source) => {
          const { count, error } = await supabaseAdmin
            .from("legal_feed_items")
            .select("id", { count: "exact", head: true })
            .eq("source", source)
            .is("removed_at", null);
          if (error) throw new Error(error.message);
          return [source, count ?? 0] as const;
        }),
      ),
      supabaseAdmin
        .from("legal_source_registry")
        .select(
          "slug, name, api_status, host_policy, last_synced_at, last_success_at, content_checksum, notes",
        )
        .order("slug"),
      supabaseAdmin
        .from("legal_feed_sync_state")
        .select("source, last_run_at, last_success_at, last_error"),
    ]);

    if (registry.error) throw new Error(registry.error.message);
    if (feedSync.error) throw new Error(feedSync.error.message);

    const chunkMap = Object.fromEntries(chunkCounts);
    const feedMap = Object.fromEntries(feedCounts);

    return {
      chunkCounts: chunkMap,
      chunkTotal: Object.values(chunkMap).reduce((a, b) => a + b, 0),
      feedCounts: feedMap,
      feedTotal: Object.values(feedMap).reduce((a, b) => a + b, 0),
      registry: registry.data ?? [],
      feedSync: feedSync.data ?? [],
    };
  });
