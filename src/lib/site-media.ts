import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SiteMedia {
  slug: string;
  category: "hero" | "empty_state" | "practice_area";
  image_url: string;
  alt_text: string;
  keywords: string[];
}

// Same pattern as src/lib/app-settings.ts — written before `supabase gen types` has seen
// site_media (added in 20260910120000_site_media.sql).
const siteMediaClient = supabase as unknown as {
  from: (table: "site_media") => {
    select: (
      columns: string,
    ) => Promise<{ data: SiteMedia[] | null; error: { message: string } | null }>;
  };
};

/** All site_media rows, cached for the session — the table is small and admin-curated. */
export const siteMediaQuery = queryOptions({
  queryKey: ["site-media"],
  queryFn: async (): Promise<SiteMedia[]> => {
    const { data, error } = await siteMediaClient.from("site_media").select("*");
    if (error) throw new Error(error.message);
    return data ?? [];
  },
  staleTime: 5 * 60_000,
});

function bySlug(rows: SiteMedia[], slug: string) {
  return rows.find((row) => row.slug === slug);
}

/**
 * Matches a lawyer's free-text `practice_areas` against each practice_area row's `keywords`
 * (case-insensitive substring match either direction) and returns the best illustration, falling
 * back to "practice-area-general" — there is no fixed practice-area lookup table in the schema.
 */
export function matchPracticeAreaMedia(
  rows: SiteMedia[],
  practiceAreas: string[],
): SiteMedia | undefined {
  const areas = practiceAreas.map((area) => area.toLowerCase());
  const candidates = rows.filter((row) => row.category === "practice_area");

  for (const row of candidates) {
    const matched = row.keywords.some((keyword) =>
      areas.some(
        (area) => area.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(area),
      ),
    );
    if (matched) return row;
  }

  return bySlug(candidates, "practice-area-general");
}

export function getEmptyStateMedia(rows: SiteMedia[], slug: string): SiteMedia | undefined {
  return bySlug(
    rows.filter((row) => row.category === "empty_state"),
    slug,
  );
}
