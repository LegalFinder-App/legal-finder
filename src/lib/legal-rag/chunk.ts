import { createHash } from "node:crypto";

const TARGET_CHARS = 1800; // ~450–600 tokens for English legal prose
const OVERLAP_CHARS = 220;

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
  return chunks.slice(0, 40); // cap per document
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
