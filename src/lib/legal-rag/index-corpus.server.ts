// Server-only. Index published LegalFinder advice / judgments / library into legal_chunks.
// No OpenAI — chunks are searched with Postgres FTS; Claude (ANTHROPIC_API_KEY) answers + expands queries.
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { chunkText, hashContent, stripHtml } from "@/lib/legal-rag/chunk";

type SourceKind = "advice" | "judgment" | "library";

type DocToIndex = {
  kind: SourceKind;
  id: string;
  registrySlug: string;
  title: string;
  citation: string | null;
  authority: "judgment" | "legislation" | "editorial" | "catalogue";
  text: string;
  sourceUrl: string | null;
  href: string;
  court: string | null;
  category: string | null;
  caseNumber: string | null;
  decidedOn: string | null;
  year: number | null;
  publishedAt: string | null;
};

function libraryAuthority(category: string | null | undefined) {
  const c = (category ?? "").toLowerCase();
  if (/constitution|statute|act|legislation|code|ordinance/.test(c)) return "legislation" as const;
  return "catalogue" as const;
}

async function loadDocuments(): Promise<DocToIndex[]> {
  const [adviceRes, judgmentRes, libraryRes] = await Promise.all([
    supabaseAdmin
      .from("legal_advices")
      .select("id, title, slug, summary, category, body, updated_at, created_at")
      .eq("published", true)
      .limit(200),
    supabaseAdmin
      .from("judgements")
      .select(
        "id, title, court, summary, body, decided_on, case_number, file_url, updated_at, created_at",
      )
      .eq("published", true)
      .limit(200),
    supabaseAdmin
      .from("library_items")
      .select("id, title, author, category, description, year, file_url, created_at")
      .limit(200),
  ]);

  if (adviceRes.error) throw new Error(adviceRes.error.message);
  if (judgmentRes.error) throw new Error(judgmentRes.error.message);
  if (libraryRes.error) throw new Error(libraryRes.error.message);

  const docs: DocToIndex[] = [];

  for (const row of adviceRes.data ?? []) {
    const body = stripHtml(row.body ?? "");
    const text = [row.title, row.summary, body].filter(Boolean).join("\n\n");
    if (text.trim().length < 40) continue;
    docs.push({
      kind: "advice",
      id: row.id,
      registrySlug: "lf-advice",
      title: row.title,
      citation: row.category || null,
      authority: "editorial",
      text,
      sourceUrl: null,
      href: row.slug ? `/advice/${row.slug}` : "/advice",
      court: null,
      category: row.category,
      caseNumber: null,
      decidedOn: null,
      year: null,
      publishedAt: row.updated_at ?? row.created_at,
    });
  }

  for (const row of judgmentRes.data ?? []) {
    const body = stripHtml(row.body ?? "");
    const text = [row.title, row.summary, body].filter(Boolean).join("\n\n");
    if (text.trim().length < 40) continue;
    docs.push({
      kind: "judgment",
      id: row.id,
      registrySlug: "lf-judgements",
      title: row.title,
      citation: [row.court, row.case_number].filter(Boolean).join(" · ") || null,
      authority: "judgment",
      text,
      sourceUrl: row.file_url,
      href: "/judgements",
      court: row.court,
      category: null,
      caseNumber: row.case_number,
      decidedOn: row.decided_on,
      year: row.decided_on ? Number(String(row.decided_on).slice(0, 4)) : null,
      publishedAt: row.updated_at ?? row.created_at,
    });
  }

  for (const row of libraryRes.data ?? []) {
    const text = [row.title, row.author, row.description].filter(Boolean).join("\n\n");
    if (text.trim().length < 40) continue;
    docs.push({
      kind: "library",
      id: row.id,
      registrySlug: "lf-library",
      title: row.title,
      citation: [row.category, row.author, row.year ? String(row.year) : null]
        .filter(Boolean)
        .join(" · "),
      authority: libraryAuthority(row.category),
      text,
      sourceUrl: row.file_url,
      href: "/library",
      court: null,
      category: row.category,
      caseNumber: null,
      decidedOn: null,
      year: row.year,
      publishedAt: row.created_at,
    });
  }

  return docs;
}

export type IndexCorpusResult = {
  skipped?: string;
  documents: number;
  chunksUpserted: number;
  chunksRemoved: number;
  errors: string[];
};

/**
 * Re-index published catalogue text into legal_chunks for Postgres FTS.
 * Idempotent per (kind, id, chunk_index). No third-party embedding key required.
 */
export async function runLegalCorpusIndex(
  options: { limitDocs?: number } = {},
): Promise<IndexCorpusResult> {
  const docs = (await loadDocuments()).slice(0, options.limitDocs ?? 200);
  let chunksUpserted = 0;
  let chunksRemoved = 0;
  const errors: string[] = [];

  for (const doc of docs) {
    try {
      const pieces = chunkText(doc.text);
      if (pieces.length === 0) continue;
      const contentHash = hashContent(pieces);

      const { data: existing } = await supabaseAdmin
        .from("legal_chunks")
        .select("content_hash, chunk_index")
        .eq("source_kind", doc.kind)
        .eq("source_id", doc.id);

      const sameHash =
        (existing ?? []).length === pieces.length &&
        (existing ?? []).every((row) => row.content_hash === contentHash);
      if (sameHash) continue;

      const { error: delError, count } = await supabaseAdmin
        .from("legal_chunks")
        .delete({ count: "exact" })
        .eq("source_kind", doc.kind)
        .eq("source_id", doc.id);
      if (delError) throw new Error(delError.message);
      chunksRemoved += count ?? 0;

      const rows = pieces.map((piece, index) => ({
        source_kind: doc.kind,
        source_id: doc.id,
        source_registry_slug: doc.registrySlug,
        chunk_index: index,
        title: doc.title,
        citation: doc.citation,
        authority: doc.authority,
        chunk_text: piece.slice(0, 7800),
        source_url: doc.sourceUrl,
        href: doc.href,
        court: doc.court,
        category: doc.category,
        case_number: doc.caseNumber,
        decided_on: doc.decidedOn,
        year: doc.year,
        published_at: doc.publishedAt,
        content_hash: contentHash,
        embedding: null,
      }));

      const { error: upsertError } = await supabaseAdmin.from("legal_chunks").insert(rows);
      if (upsertError) throw new Error(upsertError.message);
      chunksUpserted += rows.length;

      await supabaseAdmin
        .from("legal_source_registry")
        .update({
          last_synced_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          content_checksum: createHash("sha256").update(contentHash).digest("hex").slice(0, 32),
        })
        .eq("slug", doc.registrySlug);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${doc.kind}:${doc.id}: ${message.slice(0, 160)}`);
      if (errors.length >= 12) break;
    }
  }

  return {
    documents: docs.length,
    chunksUpserted,
    chunksRemoved,
    errors,
  };
}
