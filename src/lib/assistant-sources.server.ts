// Server-only. Retrieves real LegalFinder records for Counsellor AI citations and Legal Research
// mode. Prefer pgvector hybrid search when embeddings exist; fall back to keyword catalogue scan.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  CounsellorSource,
  ResearchFacets,
  ResearchFilters,
  ResearchSearchResult,
  SourceAuthority,
  SourceKind,
} from "@/lib/assistant-sources";
import { DEFAULT_RESEARCH_FILTERS, emptyFacets } from "@/lib/assistant-sources";
import { vectorSearchSources } from "@/lib/legal-rag/retrieve.server";

const STOP = new Set([
  "the",
  "and",
  "for",
  "that",
  "with",
  "this",
  "from",
  "have",
  "what",
  "when",
  "where",
  "which",
  "about",
  "into",
  "your",
  "their",
  "there",
  "should",
  "would",
  "could",
  "uganda",
  "ugandan",
  "legal",
  "law",
  "laws",
  "please",
  "help",
  "find",
  "tell",
  "explain",
  "how",
  "does",
  "can",
]);

function keywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .slice(0, 10);
}

function scoreText(haystack: string, terms: string[]): number {
  if (terms.length === 0) return 1;
  const h = haystack.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (h.includes(term)) score += term.length >= 6 ? 3 : 2;
  }
  return score;
}

function libraryAuthority(category: string | null | undefined): SourceAuthority {
  const c = (category ?? "").toLowerCase();
  if (/constitution|statute|act|legislation|code|ordinance/.test(c)) return "legislation";
  return "catalogue";
}

type Scored = CounsellorSource & { score: number };

async function loadCorpus(): Promise<CounsellorSource[]> {
  const [adviceRes, judgmentRes, libraryRes] = await Promise.all([
    supabaseAdmin
      .from("legal_advices")
      .select("id, title, slug, summary, category, body")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(80),
    supabaseAdmin
      .from("judgements")
      .select("id, title, court, summary, decided_on, case_number, file_url")
      .eq("published", true)
      .order("decided_on", { ascending: false })
      .limit(80),
    supabaseAdmin
      .from("library_items")
      .select("id, title, author, category, description, year, file_url")
      .order("title")
      .limit(80),
  ]);

  const items: CounsellorSource[] = [];

  for (const row of adviceRes.data ?? []) {
    items.push({
      id: row.id,
      kind: "advice",
      authority: "editorial",
      title: row.title,
      subtitle: row.category || "Advice guide",
      summary: row.summary,
      href: row.slug ? `/advice/${row.slug}` : "/advice",
      externalUrl: null,
      court: null,
      decidedOn: null,
      category: row.category,
      year: null,
      caseNumber: null,
    });
  }

  for (const row of judgmentRes.data ?? []) {
    items.push({
      id: row.id,
      kind: "judgment",
      authority: "judgment",
      title: row.title,
      subtitle: [row.court, row.case_number].filter(Boolean).join(" · ") || "Judgment",
      summary: row.summary,
      href: "/judgements",
      externalUrl: row.file_url,
      court: row.court,
      decidedOn: row.decided_on,
      category: null,
      year: null,
      caseNumber: row.case_number,
    });
  }

  for (const row of libraryRes.data ?? []) {
    items.push({
      id: row.id,
      kind: "library",
      authority: libraryAuthority(row.category),
      title: row.title,
      subtitle: [row.category, row.author, row.year ? String(row.year) : null]
        .filter(Boolean)
        .join(" · "),
      summary: row.description,
      href: "/library",
      externalUrl: row.file_url,
      court: null,
      decidedOn: null,
      category: row.category,
      year: row.year,
      caseNumber: null,
    });
  }

  return items;
}

function haystackFor(source: CounsellorSource): string {
  return [
    source.title,
    source.subtitle,
    source.summary,
    source.court,
    source.caseNumber,
    source.category,
    source.year ? String(source.year) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function matchesFilters(source: CounsellorSource, filters: ResearchFilters): boolean {
  if (filters.kinds.length > 0 && !filters.kinds.includes(source.kind)) return false;
  if (filters.court && source.court !== filters.court) return false;
  if (filters.category && source.category !== filters.category) return false;

  if (filters.dateFrom || filters.dateTo) {
    if (source.kind === "judgment") {
      if (!source.decidedOn) return false;
      const day = source.decidedOn.slice(0, 10);
      if (filters.dateFrom && day < filters.dateFrom) return false;
      if (filters.dateTo && day > filters.dateTo) return false;
    } else if (source.kind === "library") {
      if (!source.year) return false;
      const fromYear = filters.dateFrom ? Number(filters.dateFrom.slice(0, 4)) : null;
      const toYear = filters.dateTo ? Number(filters.dateTo.slice(0, 4)) : null;
      if (fromYear && source.year < fromYear) return false;
      if (toYear && source.year > toYear) return false;
    } else {
      return false;
    }
  }

  return true;
}

function buildFacets(items: CounsellorSource[]): ResearchFacets {
  const courts = new Set<string>();
  const categories = new Set<string>();
  const counts: ResearchFacets["counts"] = { advice: 0, judgment: 0, library: 0 };
  for (const item of items) {
    counts[item.kind] += 1;
    if (item.court) courts.add(item.court);
    if (item.category) categories.add(item.category);
  }
  return {
    courts: [...courts].sort((a, b) => a.localeCompare(b)),
    categories: [...categories].sort((a, b) => a.localeCompare(b)),
    counts,
  };
}

function mergeSources(primary: CounsellorSource[], secondary: CounsellorSource[], limit: number) {
  const seen = new Set<string>();
  const out: CounsellorSource[] = [];
  for (const source of [...primary, ...secondary]) {
    const key = `${source.kind}:${source.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(source);
    if (out.length >= limit) break;
  }
  return out;
}

async function keywordSearch(
  query: string,
  filters: ResearchFilters,
  limit: number,
): Promise<{ sources: CounsellorSource[]; facets: ResearchFacets }> {
  const corpus = await loadCorpus();
  const terms = keywords(query);
  const filtered = corpus.filter((item) => matchesFilters(item, filters));

  const scored: Scored[] = filtered
    .map((item) => ({
      ...item,
      score: scoreText(haystackFor(item), terms),
    }))
    .filter((item) => (terms.length === 0 ? true : item.score > 0));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aDate = a.decidedOn ?? (a.year ? `${a.year}-01-01` : "");
    const bDate = b.decidedOn ?? (b.year ? `${b.year}-01-01` : "");
    return bDate.localeCompare(aDate);
  });

  const sources = scored.slice(0, limit).map(({ score: _score, ...source }) => source);
  return { sources, facets: buildFacets(filtered) };
}

/**
 * Full Legal Research search with optional filters. Uses vector RAG when indexed, plus keyword
 * merge so sparse corpora still return useful hits.
 */
export async function searchLegalResearch(
  query: string,
  filters: ResearchFilters = DEFAULT_RESEARCH_FILTERS,
  limit = 24,
): Promise<ResearchSearchResult> {
  try {
    const keyword = await keywordSearch(query, filters, limit);
    const vector = query.trim()
      ? await vectorSearchSources(query, limit, {
          kinds: filters.kinds.length ? filters.kinds : undefined,
          court: filters.court,
          category: filters.category,
        })
      : [];

    const vectorFiltered = vector.filter((item) => matchesFilters(item, filters));
    const sources = mergeSources(vectorFiltered, keyword.sources, limit);

    return {
      query: query.trim(),
      sources,
      facets: keyword.facets,
    };
  } catch (error) {
    console.error("[assistant-sources] research search failed", error);
    return { query: query.trim(), sources: [], facets: emptyFacets() };
  }
}

/**
 * Rank published advice, judgments and library items against the question for chat citations.
 */
export async function findRelevantSources(
  query: string,
  limit = 6,
  filters: ResearchFilters = DEFAULT_RESEARCH_FILTERS,
): Promise<CounsellorSource[]> {
  const result = await searchLegalResearch(query, filters, limit);
  return result.sources;
}

export function formatSourcesForPrompt(sources: CounsellorSource[]): string {
  if (sources.length === 0) return "";
  const exampleId = sources[0]?.id ?? "id";
  const lines = sources.map((source, index) => {
    const authority =
      source.authority === "editorial"
        ? "EDITORIAL (not official law)"
        : source.authority === "judgment"
          ? "COURT JUDGMENT summary on LegalFinder"
          : source.authority === "legislation"
            ? "LEGISLATION / statute catalogue entry"
            : "LIBRARY catalogue entry";
    return `${index + 1}. [${source.kind}:${source.id}] (${authority}) ${source.title}${
      source.subtitle ? ` — ${source.subtitle}` : ""
    }${source.summary ? `\n   Summary: ${source.summary.slice(0, 280)}` : ""}`;
  });

  return `LegalFinder sources retrieved for this question (cite only from this list):
${lines.join("\n")}

Citation rules:
- When you rely on one of these sources, place an inline citation token exactly like [[cite:KIND:ID]] (example: [[cite:${sources[0]?.kind ?? "advice"}:${exampleId}]]).
- Only cite IDs from the list above. Never invent case numbers, statute citations, or source IDs.
- If a source is marked EDITORIAL, say it is a LegalFinder guide — do not present it as official legislation.
- If none of the sources fit, answer without citations and point the reader to /advice, /judgements or /library.`;
}

export type { SourceKind };
