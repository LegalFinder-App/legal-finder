// Server-only. Full-text match via search_legal_chunks (no OpenAI). Maps hits to CounsellorSource.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { CounsellorSource, SourceKind } from "@/lib/assistant-sources";
import { expandSearchQuery } from "@/lib/legal-rag/query-expand.server";

type MatchRow = {
  id: string;
  source_kind: SourceKind;
  source_id: string;
  title: string;
  citation: string | null;
  authority: CounsellorSource["authority"];
  chunk_text: string;
  source_url: string | null;
  href: string | null;
  court: string | null;
  category: string | null;
  case_number: string | null;
  decided_on: string | null;
  year: number | null;
  similarity: number;
};

function toSource(row: MatchRow): CounsellorSource {
  return {
    id: row.source_id,
    kind: row.source_kind,
    authority: row.authority,
    title: row.title,
    subtitle: row.citation,
    summary: row.chunk_text.slice(0, 320),
    href:
      row.href ||
      (row.source_kind === "advice"
        ? "/advice"
        : row.source_kind === "judgment"
          ? "/judgements"
          : "/library"),
    externalUrl: row.source_url && /^https?:/i.test(row.source_url) ? row.source_url : null,
    court: row.court,
    decidedOn: row.decided_on,
    category: row.category,
    year: row.year,
    caseNumber: row.case_number,
  };
}

export async function vectorSearchSources(
  query: string,
  limit = 8,
  filters?: { kinds?: SourceKind[]; court?: string | null; category?: string | null },
): Promise<CounsellorSource[]> {
  if (!query.trim()) return [];

  try {
    const searchText = await expandSearchQuery(query.trim());
    const { data, error } = await supabaseAdmin.rpc("search_legal_chunks", {
      query_text: searchText,
      match_count: Math.min(40, Math.max(limit * 3, 12)),
      filter_kinds: filters?.kinds?.length ? filters.kinds : null,
      filter_court: filters?.court ?? null,
      filter_category: filters?.category ?? null,
    });

    if (error) {
      // Table/RPC not applied yet — silent empty so keyword fallback still works.
      console.error("[legal-rag] search_legal_chunks", error.message);
      return [];
    }

    const rows = (data ?? []) as MatchRow[];
    const byDoc = new Map<string, MatchRow>();
    for (const row of rows) {
      const key = `${row.source_kind}:${row.source_id}`;
      const prev = byDoc.get(key);
      if (!prev || row.similarity > prev.similarity) byDoc.set(key, row);
    }

    return [...byDoc.values()]
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(toSource);
  } catch (error) {
    console.error(
      "[legal-rag] FTS search failed",
      error instanceof Error ? error.name : "error",
    );
    return [];
  }
}

export async function corpusChunkCount(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("legal_chunks")
    .select("id", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}
