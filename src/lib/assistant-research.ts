import type {
  ResearchFacets,
  ResearchFilters,
  ResearchSearchResult,
} from "@/lib/assistant-sources";
import { DEFAULT_RESEARCH_FILTERS, emptyFacets } from "@/lib/assistant-sources";
import { clerkApiHeaders } from "@/lib/clerk-browser-token";

export async function searchCounsellorResearch(
  query: string,
  filters: ResearchFilters = DEFAULT_RESEARCH_FILTERS,
  signal?: AbortSignal,
): Promise<ResearchSearchResult> {
  const headers = await clerkApiHeaders({ "Content-Type": "application/json" });

  const response = await fetch("/api/assistant/research", {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({
      query,
      kinds: filters.kinds,
      court: filters.court,
      category: filters.category,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      limit: 24,
    }),
    signal,
  });

  if (!response.ok) {
    let message = "Research search is unavailable right now.";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) message = payload.error;
    } catch {
      // Non-JSON body.
    }
    throw new Error(message);
  }

  return (await response.json()) as ResearchSearchResult;
}

export function mergeFacets(current: ResearchFacets, next: ResearchFacets): ResearchFacets {
  const courts = new Set([...current.courts, ...next.courts]);
  const categories = new Set([...current.categories, ...next.categories]);
  return {
    courts: [...courts].sort((a, b) => a.localeCompare(b)),
    categories: [...categories].sort((a, b) => a.localeCompare(b)),
    counts: {
      advice: Math.max(current.counts.advice, next.counts.advice),
      judgment: Math.max(current.counts.judgment, next.counts.judgment),
      library: Math.max(current.counts.library, next.counts.library),
      news: Math.max(current.counts.news, next.counts.news),
    },
  };
}

export { emptyFacets };
