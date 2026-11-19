/** Live web citations from Anthropic web_search — distinct from LegalFinder corpus rows. */
export type CounsellorWebSource = {
  id: string;
  title: string;
  url: string;
  snippet: string | null;
  pageAge?: string | null;
};

export function webSourceId(url: string, index: number) {
  return `web-${index}-${url.slice(0, 48).replace(/[^a-zA-Z0-9]+/g, "")}`;
}

export function dedupeWebSources(sources: CounsellorWebSource[]): CounsellorWebSource[] {
  const seen = new Set<string>();
  const out: CounsellorWebSource[] = [];
  for (const source of sources) {
    const key = source.url.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(source);
  }
  return out;
}
