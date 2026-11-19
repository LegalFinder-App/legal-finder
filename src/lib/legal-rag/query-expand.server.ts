/**
 * Optional Anthropic-assisted keyword expansion for FTS (uses existing ANTHROPIC_API_KEY).
 * Failures fall back to the raw user query — never blocks retrieval.
 */

const cache = new Map<string, { at: number; value: string }>();
const TTL_MS = 10 * 60_000;

export async function expandSearchQuery(query: string): Promise<string> {
  const trimmed = query.trim().slice(0, 500);
  if (!trimmed) return query;

  const cached = cache.get(trimmed.toLowerCase());
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return trimmed;

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 80,
      temperature: 0,
      system:
        "You extract Uganda-law search keywords for Postgres full-text search. Reply with 5–12 space-separated terms only (statute names, topics, courts). No punctuation except hyphens. No explanations.",
      messages: [{ role: "user", content: trimmed }],
    });
    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join(" ")
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const expanded = text ? `${trimmed} ${text}` : trimmed;
    cache.set(trimmed.toLowerCase(), { at: Date.now(), value: expanded });
    return expanded;
  } catch {
    return trimmed;
  }
}
