// Collector for the legal feed. Runs from /api/cron/legal-feed (daily, Vercel Cron) and can be
// run by hand with scripts/sync-legal-feed.mjs. Rules it follows (docs/SOURCES.md):
//  - honest User-Agent, ≥ 3 s between requests to the same host, exponential backoff on errors;
//  - conditional requests where the server supports them, content hashing where it doesn't;
//  - aggregation only (headline, date, category, short redacted summary, link);
//  - ULII is never fetched unless ULII_ENABLED=true AND an API contract has been agreed.
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import {
  JUDICIARY_BASE,
  mapUpfPost,
  parseJudiciaryArticle,
  parseJudiciaryListing,
  type ParsedItem,
  UPF_ADVISORY_SLUGS,
  type UpfCategory,
  type UpfPost,
} from "./parse";

const USER_AGENT = "LegalFinderFeed/1.0 (+https://legalfinder.co/contact; support@legalfinder.co)";
const MIN_GAP_MS = 3_000;
const MAX_NEW_JUDICIARY_ARTICLES = 8; // per run — keeps one run well inside the function limit

const lastRequestAt = new Map<string, number>();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type FetchResult = {
  status: number;
  body: string;
  etag: string | null;
  lastModified: string | null;
};

/** Polite GET: per-host spacing, conditional headers, 3 tries with exponential backoff. */
async function politeGet(url: string, conditional?: { etag?: string; lastModified?: string }) {
  const host = new URL(url).host;
  for (let attempt = 0; attempt < 3; attempt++) {
    const gap = (lastRequestAt.get(host) ?? 0) + MIN_GAP_MS - Date.now();
    if (gap > 0) await wait(gap);
    lastRequestAt.set(host, Date.now());
    const headers: Record<string, string> = { "User-Agent": USER_AGENT, Accept: "*/*" };
    if (conditional?.etag) headers["If-None-Match"] = conditional.etag;
    if (conditional?.lastModified) headers["If-Modified-Since"] = conditional.lastModified;
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      return {
        status: res.status,
        body: res.status === 304 ? "" : await res.text(),
        etag: res.headers.get("etag"),
        lastModified: res.headers.get("last-modified"),
      } satisfies FetchResult;
    } catch (error) {
      if (attempt === 2) throw error;
      await wait(2_000 * 2 ** attempt); // 2 s, 4 s
    }
  }
  throw new Error("unreachable");
}

type SourceState = Record<string, Json>;
type SourceResult = {
  source: string;
  fetched: number;
  upserted: number;
  removed: number;
  skipped?: string;
};

async function upsertItems(items: ParsedItem[]) {
  if (items.length === 0) return 0;
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("legal_feed_items").upsert(
    items.map((i) => ({ ...i, last_seen_at: now, removed_at: null })),
    { onConflict: "source,source_id" },
  );
  if (error) throw new Error(`Saving ${items[0].source} items failed: ${error.message}`);
  return items.length;
}

/**
 * Items we hold for a source, published inside the window the source just listed, that the
 * source no longer lists — taken down there, so we stop showing them too.
 */
async function markRemoved(
  source: ParsedItem["source"],
  listedIds: string[],
  oldestListed: string | null,
) {
  if (!oldestListed || listedIds.length === 0) return 0;
  const { data, error } = await supabaseAdmin
    .from("legal_feed_items")
    .update({ removed_at: new Date().toISOString() })
    .eq("source", source)
    .is("removed_at", null)
    .gte("published_at", oldestListed)
    .not("source_id", "in", `(${listedIds.map((id) => `"${id}"`).join(",")})`)
    .select("id");
  if (error) throw new Error(`Marking removed ${source} items failed: ${error.message}`);
  return data?.length ?? 0;
}

/* ---------------- Uganda Police Force ---------------- */

const UPF_API = "https://upf.go.ug/wp-json/wp/v2";
const UPF_FIELDS = "_fields=id,date_gmt,link,title,excerpt,categories";

/**
 * Safety and road advisories are sparse and quickly pushed out of the latest-posts window by
 * press releases, so they get one small request of their own (for the Advice page).
 */
async function syncUpfAdvisories(categories: UpfCategory[]) {
  const ids = categories.filter((c) => UPF_ADVISORY_SLUGS.includes(c.slug)).map((c) => c.id);
  if (ids.length === 0) return { fetched: 0, upserted: 0 };
  const res = await politeGet(
    `${UPF_API}/posts?per_page=20&categories=${ids.join(",")}&${UPF_FIELDS}`,
  );
  if (res.status !== 200) return { fetched: 0, upserted: 0 };
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const raw = JSON.parse(res.body) as UpfPost[];
  const items = raw.map((p) => mapUpfPost(p, catMap)).filter((i): i is ParsedItem => i !== null);
  return { fetched: raw.length, upserted: await upsertItems(items) };
}

async function syncUpf(state: SourceState): Promise<{ result: SourceResult; state: SourceState }> {
  // Categories change rarely; refresh them at most once a week.
  let categories = (state.categories as UpfCategory[] | undefined) ?? [];
  const catAge = Date.now() - Number(state.categoriesAt ?? 0);
  const categoriesFresh = categories.length === 0 || catAge > 7 * 24 * 3600_000;
  if (categoriesFresh) {
    const cats = await politeGet(`${UPF_API}/categories?per_page=100&_fields=id,slug,name`);
    if (cats.status === 200) categories = JSON.parse(cats.body) as UpfCategory[];
  }
  const categoryState = {
    categories: categories as unknown as Json,
    categoriesAt: categoriesFresh ? Date.now() : (state.categoriesAt ?? Date.now()),
  };
  const advisories = await syncUpfAdvisories(categories);

  const postsUrl = `${UPF_API}/posts?per_page=40&${UPF_FIELDS}`;
  const posts = await politeGet(postsUrl, {
    etag: typeof state.etag === "string" ? state.etag : undefined,
    lastModified: typeof state.lastModified === "string" ? state.lastModified : undefined,
  });
  if (posts.status === 304) {
    return {
      result: {
        source: "upf",
        fetched: advisories.fetched,
        upserted: advisories.upserted,
        removed: 0,
        skipped: "latest posts not modified",
      },
      state: { ...state, ...categoryState },
    };
  }
  if (posts.status !== 200) throw new Error(`UPF posts: HTTP ${posts.status}`);
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const raw = JSON.parse(posts.body) as UpfPost[];
  const items = raw.map((p) => mapUpfPost(p, catMap)).filter((i): i is ParsedItem => i !== null);
  const upserted = await upsertItems(items);
  const dates = items
    .map((i) => i.published_at)
    .filter((d): d is string => Boolean(d))
    .sort();
  const removed = await markRemoved(
    "upf",
    raw.map((p) => String(p.id)),
    dates[0] ?? null,
  );
  return {
    result: {
      source: "upf",
      fetched: raw.length + advisories.fetched,
      upserted: upserted + advisories.upserted,
      removed,
    },
    state: { etag: posts.etag, lastModified: posts.lastModified, ...categoryState },
  };
}

/* ---------------- Judiciary of Uganda ---------------- */

async function syncJudiciary(
  state: SourceState,
): Promise<{ result: SourceResult; state: SourceState }> {
  const listing = await politeGet(`${JUDICIARY_BASE}data/press/news.html`);
  if (listing.status !== 200) throw new Error(`Judiciary listing: HTTP ${listing.status}`);
  // The server sends no ETag/Last-Modified, so a hash tells us whether anything changed.
  const hash = createHash("sha256").update(listing.body).digest("hex");
  if (hash === state.hash) {
    return {
      result: { source: "judiciary", fetched: 0, upserted: 0, removed: 0, skipped: "unchanged" },
      state,
    };
  }
  const listed = parseJudiciaryListing(listing.body);
  if (listed.length === 0)
    throw new Error("Judiciary listing parsed to zero stories — layout may have changed");

  const admin = supabaseAdmin;
  const { data: known, error } = await admin
    .from("legal_feed_items")
    .select("source_id, published_at")
    .eq("source", "judiciary")
    .in(
      "source_id",
      listed.map((l) => l.source_id),
    );
  if (error) throw new Error(`Reading known judiciary items failed: ${error.message}`);
  const knownIds = new Set((known ?? []).map((k) => k.source_id));

  // Only stories we have never seen cost an extra request (their date is on the article page).
  const fresh = listed
    .filter((l) => !knownIds.has(l.source_id))
    .slice(0, MAX_NEW_JUDICIARY_ARTICLES);
  const items: ParsedItem[] = [];
  for (const story of fresh) {
    const page = await politeGet(story.url);
    if (page.status !== 200) continue;
    const article = parseJudiciaryArticle(page.body, story.title);
    items.push({
      source: "judiciary",
      source_id: story.source_id,
      url: story.url,
      title: story.title,
      category: "Court news",
      ...article,
    });
  }
  const upserted = await upsertItems(items);
  // Refresh last_seen_at for stories still listed.
  if (knownIds.size > 0) {
    await admin
      .from("legal_feed_items")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("source", "judiciary")
      .in("source_id", [...knownIds]);
  }
  const dates = [...items.map((i) => i.published_at), ...(known ?? []).map((k) => k.published_at)]
    .filter((d): d is string => Boolean(d))
    .sort();
  const removed = await markRemoved(
    "judiciary",
    listed.map((l) => l.source_id),
    dates[0] ?? null,
  );
  // If we capped this run, don't store the hash, so the remaining stories are picked up next time.
  const capped = listed.filter((l) => !knownIds.has(l.source_id)).length > fresh.length;
  return {
    result: { source: "judiciary", fetched: 1 + fresh.length, upserted, removed },
    state: { hash: capped ? (state.hash ?? null) : hash },
  };
}

/* ---------------- ULII (licensed access only) ---------------- */

async function syncUlii(): Promise<SourceResult> {
  // ULII's terms forbid scraping; only an agreed API may be used (docs/ULII_ACCESS_REQUEST.md).
  // Even when enabled, nothing is fetched until the API contract from ULII is implemented here.
  if (process.env.ULII_ENABLED !== "true") {
    return {
      source: "ulii",
      fetched: 0,
      upserted: 0,
      removed: 0,
      skipped: "disabled (ULII_ENABLED is not true)",
    };
  }
  if (!process.env.ULII_API_BASE || !process.env.ULII_API_TOKEN) {
    return {
      source: "ulii",
      fetched: 0,
      upserted: 0,
      removed: 0,
      skipped: "missing ULII_API_BASE/ULII_API_TOKEN",
    };
  }
  return {
    source: "ulii",
    fetched: 0,
    upserted: 0,
    removed: 0,
    skipped: "awaiting ULII API contract",
  };
}

/* ---------------- run ---------------- */

export async function runLegalFeedSync() {
  const admin = supabaseAdmin;
  const { data: rows } = await admin.from("legal_feed_sync_state").select("source, state");
  const stateOf = (source: string) =>
    ((rows ?? []).find((r) => r.source === source)?.state as SourceState | undefined) ?? {};

  const results: SourceResult[] = [];
  for (const [source, run] of [
    ["upf", syncUpf],
    ["judiciary", syncJudiciary],
  ] as const) {
    const startedAt = new Date().toISOString();
    try {
      const { result, state } = await run(stateOf(source));
      results.push(result);
      await admin.from("legal_feed_sync_state").upsert({
        source,
        last_run_at: startedAt,
        last_success_at: new Date().toISOString(),
        last_error: null,
        state: state as Json,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[legal-feed] ${source}:`, message);
      results.push({ source, fetched: 0, upserted: 0, removed: 0, skipped: `error: ${message}` });
      await admin
        .from("legal_feed_sync_state")
        .upsert({ source, last_run_at: startedAt, last_error: message.slice(0, 2000) });
    }
  }
  results.push(await syncUlii());
  return { results };
}
