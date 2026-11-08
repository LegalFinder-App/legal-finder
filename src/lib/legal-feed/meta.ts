// Client-safe metadata and queries for the legal feed (no server imports).
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { unwrap } from "@/lib/queries";
import type { LegalFeedItemRow } from "@/integrations/supabase/app-database";

export type LegalFeedItem = Pick<
  LegalFeedItemRow,
  | "id"
  | "source"
  | "url"
  | "title"
  | "summary"
  | "summary_withheld"
  | "category"
  | "published_at"
  | "last_seen_at"
>;

export const legalFeedQuery = queryOptions({
  queryKey: ["legal-feed"],
  queryFn: async (): Promise<LegalFeedItem[]> =>
    unwrap(
      await supabase
        .from("legal_feed_items")
        .select(
          "id, source, url, title, summary, summary_withheld, category, published_at, last_seen_at",
        )
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(200),
    ) as LegalFeedItem[],
  staleTime: 5 * 60_000,
});

export const SOURCE_META = {
  judiciary: {
    name: "Judiciary of Uganda",
    short: "Judiciary",
    host: "judiciary.go.ug",
    home: "https://judiciary.go.ug/",
  },
  upf: {
    name: "Uganda Police Force",
    short: "Police",
    host: "upf.go.ug",
    home: "https://upf.go.ug/",
  },
  ulii: {
    name: "ULII — Uganda Legal Information Institute",
    short: "ULII",
    host: "ulii.org",
    home: "https://ulii.org/",
  },
} as const;

/** ULII court listings we deep-link to (no ULII content is fetched — docs/SOURCES.md). */
export const ULII_COURTS = [
  { code: "UGSC", name: "Supreme Court", note: "Final appeals and constitutional matters" },
  { code: "UGCA", name: "Court of Appeal", note: "Also sits as the Constitutional Court" },
  { code: "UGHC", name: "High Court", note: "All divisions of the High Court" },
  { code: "UGCommC", name: "Commercial Court", note: "High Court, Commercial Division" },
  { code: "UGIC", name: "Industrial Court", note: "Labour and employment disputes" },
  { code: "UGHCEP", name: "Election petitions", note: "High Court election petitions" },
] as const;

export const uliiCourtUrl = (code: string) => `https://ulii.org/en/judgments/${code}/`;
export const uliiSearchUrl = (q: string) =>
  `https://ulii.org/en/search/?q=${encodeURIComponent(q.trim())}`;

export const ULII_ATTRIBUTION = "Source: ULII (ulii.org), CC BY-NC 4.0";

/** Opens an email to the team about one item — used for corrections and removal requests. */
export function reportConcernHref(item: Pick<LegalFeedItem, "title" | "url">) {
  const subject = `Concern about a legal update: ${item.title}`.slice(0, 180);
  const body = `Item: ${item.title}\nOriginal: ${item.url}\n\nWhat is the concern? (e.g. it identifies a victim or a child, it is wrong, or you would like it removed)\n\n`;
  return `mailto:support@legalfinder.co?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
