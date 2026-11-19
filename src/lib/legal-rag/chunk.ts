import { createHash } from "node:crypto";

const TARGET_CHARS = 1800; // ~450–600 tokens for English legal prose
const OVERLAP_CHARS = 220;
const MAX_CHUNKS_PER_DOC = 80;

/** Split long text into overlapping chunks suitable for embedding. */
export function chunkText(raw: string, maxChars = TARGET_CHARS, overlap = OVERLAP_CHARS): string[] {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return [];
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const slice = text.slice(start, end);
      const breakAt = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("; "), slice.lastIndexOf(" "));
      if (breakAt > maxChars * 0.4) end = start + breakAt + 1;
    }
    const piece = text.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= text.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks.slice(0, MAX_CHUNKS_PER_DOC);
}

export type StatuteSectionChunk = {
  /** e.g. "s. 23" or "Art. 23" */
  citation: string;
  text: string;
};

/**
 * Prefer section / article boundaries for Acts and the Constitution so citations
 * stay precise (`Cap. … s. …`). Falls back to generic chunkText when no headings found.
 */
export function chunkStatuteText(
  raw: string,
  options: { title?: string | null; maxChars?: number } = {},
): StatuteSectionChunk[] {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const heading =
    /(?:^|\n)\s*((?:Article|Art\.?|Section|Sec\.?|S\.?)\s+\d+[A-Za-z0-9.-]*)\s*[\.\:\)]?\s*/gi;
  const parts: Array<{ citation: string; body: string }> = [];
  let lastCitation = options.title?.trim() || "Preamble";
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(heading.source, heading.flags);

  while ((match = re.exec(text)) !== null) {
    const body = text.slice(lastIndex, match.index).trim();
    if (body) parts.push({ citation: lastCitation, body });
    lastCitation = normalizeStatuteCitation(match[1] ?? "Section");
    lastIndex = match.index + match[0].length;
  }
  const tail = text.slice(lastIndex).trim();
  if (tail) parts.push({ citation: lastCitation, body: tail });

  if (parts.length <= 1) {
    return chunkText(text, options.maxChars).map((piece, i) => ({
      citation: i === 0 ? lastCitation : `${lastCitation} (cont.)`,
      text: piece,
    }));
  }

  const out: StatuteSectionChunk[] = [];
  for (const part of parts) {
    const pieces = chunkText(part.body, options.maxChars ?? TARGET_CHARS);
    pieces.forEach((piece, i) => {
      out.push({
        citation: i === 0 ? part.citation : `${part.citation} (cont.)`,
        text: `${part.citation}. ${piece}`.slice(0, 7800),
      });
    });
  }
  return out.slice(0, MAX_CHUNKS_PER_DOC);
}

function normalizeStatuteCitation(raw: string): string {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (/^art/i.test(cleaned)) {
    return cleaned.replace(/^art(?:icle)?\.?\s*/i, "Art. ");
  }
  return cleaned.replace(/^(?:section|sec\.?|s\.?)\s*/i, "s. ");
}

export function hashContent(parts: string[]): string {
  return createHash("sha256").update(parts.join("\n---\n")).digest("hex").slice(0, 64);
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
