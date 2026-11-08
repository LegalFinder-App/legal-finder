import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CONTENT_TYPES } from "./registry";

export type ContentCount = { total: number; published: number | null; updatedAt: string | null };

/**
 * Per-type totals for the CMS home and rail: head-only count queries (no rows transferred),
 * plus a published count where the table has that column. Admin RLS sees every row.
 */
export const contentCountsQuery = queryOptions({
  queryKey: ["admin-content-counts"],
  queryFn: async (): Promise<Record<string, ContentCount>> => {
    const entries = await Promise.all(
      CONTENT_TYPES.map(async (type) => {
        const table = type.config.table as never;
        const hasPublished = type.config.fields.some((f) => f.name === "published");
        const total = await supabase.from(table).select("id", { count: "exact", head: true });
        const published = hasPublished
          ? await supabase
              .from(table)
              .select("id", { count: "exact", head: true })
              .eq("published" as never, true as never)
          : null;
        return [
          type.id,
          {
            total: total.count ?? 0,
            published: published ? (published.count ?? 0) : null,
            updatedAt: null,
          },
        ] as const;
      }),
    );
    return Object.fromEntries(entries);
  },
  staleTime: 30_000,
});
