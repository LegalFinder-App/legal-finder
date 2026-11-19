/**
 * Client-safe citation types and helpers for Counsellor AI. Source records themselves are
 * assembled on the server from live LegalFinder tables — never invented in the UI.
 */

export type SourceKind = "advice" | "judgment" | "library" | "news";

/** How authoritative the record is — never imply editorial guides are official law. */
export type SourceAuthority =
  | "judgment"
  | "legislation"
  | "editorial"
  | "catalogue"
  | "news";

export type CounsellorSource = {
  id: string;
  kind: SourceKind;
  authority: SourceAuthority;
  title: string;
  subtitle: string | null;
  summary: string | null;
  href: string;
  externalUrl: string | null;
  court: string | null;
  decidedOn: string | null;
  category: string | null;
  year: number | null;
  caseNumber: string | null;
  /** Source material date (judgment / headline / publish). */
  publishedAt?: string | null;
  /** When LegalFinder last indexed this record into the corpus (trust chrome). */
  indexedAt?: string | null;
};

export const CITE_PATTERN =
  /\[\[cite:(advice|judgment|library|news):([a-zA-Z0-9_-]+)\]\]/g;

export const AUTHORITY_LABEL: Record<SourceAuthority, string> = {
  judgment: "Court judgment",
  legislation: "Legislation / statute",
  editorial: "LegalFinder guide",
  catalogue: "Library catalogue",
  news: "Official headline (aggregation)",
};

export const AUTHORITY_HINT: Record<SourceAuthority, string> = {
  judgment: "Summary of a court decision published on LegalFinder.",
  legislation: "Catalogue entry for legislation or an official reference text.",
  editorial: "Editorial explanation — not an official legal authority.",
  catalogue: "Library catalogue item — open the original for the full text.",
  news: "Headline and short summary from Judiciary or UPF — open the original for the full article.",
};

export function citeToken(kind: SourceKind, id: string) {
  return `[[cite:${kind}:${id}]]`;
}

export function extractCitedIds(text: string): Array<{ kind: SourceKind; id: string }> {
  const found: Array<{ kind: SourceKind; id: string }> = [];
  const seen = new Set<string>();
  const re = new RegExp(CITE_PATTERN.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const kind = match[1] as SourceKind;
    const id = match[2];
    const key = `${kind}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({ kind, id });
  }
  return found;
}

export function resolveSourcesFromText(
  text: string,
  sources: CounsellorSource[] | undefined,
): CounsellorSource[] {
  if (!sources?.length) return [];
  const cited = extractCitedIds(text);
  return cited
    .map(({ kind, id }) => sources.find((s) => s.kind === kind && s.id === id))
    .filter((s): s is CounsellorSource => Boolean(s));
}

/** Filters for Legal Research mode — applied against real LegalFinder rows. */
export type ResearchFilters = {
  kinds: SourceKind[];
  court: string | null;
  category: string | null;
  /** Inclusive ISO date (YYYY-MM-DD) for judgment decided_on / library year lower bound. */
  dateFrom: string | null;
  dateTo: string | null;
};

export type ResearchFacets = {
  courts: string[];
  categories: string[];
  counts: Record<SourceKind, number>;
};

export type ResearchSearchResult = {
  query: string;
  sources: CounsellorSource[];
  facets: ResearchFacets;
};

export const DEFAULT_RESEARCH_FILTERS: ResearchFilters = {
  kinds: ["advice", "judgment", "library", "news"],
  court: null,
  category: null,
  dateFrom: null,
  dateTo: null,
};

export function emptyFacets(): ResearchFacets {
  return {
    courts: [],
    categories: [],
    counts: { advice: 0, judgment: 0, library: 0, news: 0 },
  };
}
