/**
 * Anthropic does not offer an embeddings API (docs point at Voyage as a third party).
 * LegalFinder Phase 1 indexes chunks with Postgres full-text search only — no OpenAI key.
 * This module stays as a thin capability probe so older call sites keep compiling.
 */

export function embeddingsConfigured(): boolean {
  // Dense vectors are optional; FTS indexing always works.
  return false;
}

export function embeddingDimensions() {
  return 0;
}

export async function embedTexts(_texts: string[]): Promise<number[][]> {
  throw new Error(
    "Dense embeddings are disabled — Anthropic has no embedding API. Use Postgres FTS indexing.",
  );
}

export async function embedQuery(_query: string): Promise<number[]> {
  throw new Error(
    "Dense embeddings are disabled — Anthropic has no embedding API. Use Postgres FTS indexing.",
  );
}
