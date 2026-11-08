// Parsers for each source's public output. Pure functions over strings/JSON, unit-tested with
// fixtures; the network side lives in sync.server.ts. Endpoints and quirks: docs/SOURCES.md.
import { htmlToText, summarize, tidyTitle } from "./text";

export type ParsedItem = {
  source: "judiciary" | "upf";
  source_id: string;
  url: string;
  title: string;
  summary: string | null;
  summary_withheld: boolean;
  category: string | null;
  published_at: string | null;
};

/* ---------------- Uganda Police Force (WordPress REST API) ---------------- */

export type UpfPost = {
  id: number;
  date_gmt?: string;
  date?: string;
  link: string;
  title: { rendered: string };
  excerpt?: { rendered: string };
  categories?: number[];
};

export type UpfCategory = { id: number; slug: string; name: string };

/** Display names for the categories we show; sports and catch-alls are left out on purpose. */
export const UPF_CATEGORIES: Record<string, string> = {
  "press-release": "Press release",
  "crime-operations": "Crime & operations",
  "public-saftey": "Public safety", // sic — the site's own slug
  "public-safety": "Public safety",
  "traffic-alert": "Traffic alert",
  "community-policing": "Community policing",
  transfersappointments: "Appointments",
  "regional-international-cooperation": "Cooperation",
};
const UPF_SKIP = new Set(["sports"]);
/** Safety and road advisories; they win over broader categories so the Advice page finds them. */
export const UPF_ADVISORY_SLUGS = ["public-saftey", "public-safety", "traffic-alert"];

export function mapUpfPost(post: UpfPost, categories: Map<number, UpfCategory>): ParsedItem | null {
  const slugs = (post.categories ?? [])
    .map((id) => categories.get(id)?.slug)
    .filter((s): s is string => Boolean(s));
  if (slugs.some((s) => UPF_SKIP.has(s))) return null;
  if (!/^https:\/\/(www\.)?upf\.go\.ug\//.test(post.link)) return null;
  const advisory = slugs.find((s) => UPF_ADVISORY_SLUGS.includes(s));
  const category =
    (advisory && UPF_CATEGORIES[advisory]) ??
    slugs.map((s) => UPF_CATEGORIES[s]).find(Boolean) ??
    "News";
  const title = tidyTitle(htmlToText(post.title.rendered));
  const { summary, withheld } = summarize(htmlToText(post.excerpt?.rendered ?? ""), { title });
  const dateGmt = post.date_gmt ?? null;
  return {
    source: "upf",
    source_id: String(post.id),
    url: post.link,
    title,
    summary,
    summary_withheld: withheld,
    category,
    // date_gmt is UTC without a zone suffix.
    published_at: dateGmt ? new Date(`${dateGmt}Z`).toISOString() : null,
  };
}

/* ---------------- Judiciary of Uganda (server-rendered HTML) ---------------- */

export const JUDICIARY_BASE = "https://judiciary.go.ug/";

export type JudiciaryListing = { source_id: string; url: string; title: string };

/** News listing (/data/press/news.html): unique stories in page order. */
export function parseJudiciaryListing(html: string): JudiciaryListing[] {
  const seen = new Map<string, JudiciaryListing>();
  const re = /<a[^>]+href="\.?\/?(data\/news\/\d+\/(\d+)\/[^"]+\.html)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(re)) {
    const [, path, id, inner] = m;
    const text = htmlToText(inner);
    // Each story is linked three times (image, title, "Read More"); keep the real title.
    if (!text || /^read more/i.test(text)) {
      if (!seen.has(id)) seen.set(id, { source_id: id, url: encodeJudiciaryUrl(path), title: "" });
      continue;
    }
    const prev = seen.get(id);
    if (!prev || !prev.title)
      seen.set(id, { source_id: id, url: encodeJudiciaryUrl(path), title: text });
  }
  return [...seen.values()].filter((i) => i.title);
}

function encodeJudiciaryUrl(path: string) {
  return (
    JUDICIARY_BASE +
    path
      .split("/")
      .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
      .join("/")
  );
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** "Posted 27th, October 2026" → 2026-10-27 (Kampala midnight, as UTC). */
export function parseJudiciaryDate(text: string): string | null {
  const m = text.match(
    /Posted\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(January|February|March|April|May|June|July|August|September|October|November|December),?\s+(\d{4})/i,
  );
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTHS.indexOf(m[2].toLowerCase());
  const year = Number(m[3]);
  if (month < 0 || day < 1 || day > 31) return null;
  // Midnight in Kampala (UTC+3) is 21:00 the previous day in UTC.
  return new Date(Date.UTC(year, month, day, 0, 0, 0) - 3 * 3600_000).toISOString();
}

/** Article page → date and an extractive, redacted summary from its first paragraphs. */
export function parseJudiciaryArticle(html: string, title?: string) {
  const text = htmlToText(html);
  const published_at = parseJudiciaryDate(text);
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => htmlToText(m[1]))
    .filter((p) => p.length > 80 && !/^(posted|share|copyright|©)/i.test(p));
  const { summary, withheld } = summarize(paragraphs.slice(0, 3).join(" "), { title });
  return { published_at, summary, summary_withheld: withheld };
}
