import type { ResearchFilters } from "@/lib/assistant-sources";
import type { Conversation } from "./types";

const PREFIX = "legalfinder.counsellor.v1";
const RESEARCH_PREFIX = "legalfinder.counsellor.research.v1";

export type ResearchHistoryEntry = {
  id: string;
  query: string;
  filters: ResearchFilters;
  resultCount: number;
  at: string;
};

function keyFor(userId: string) {
  return `${PREFIX}:${userId}`;
}

function researchKeyFor(userId: string) {
  return `${RESEARCH_PREFIX}:${userId}`;
}

/**
 * Conversations are localStorage-only and keyed by Clerk user id. Never read/write under a
 * shared "anon" key for a signed-in person — that would leak chats across accounts on one device.
 */
export function loadConversations(userId: string | null | undefined): Conversation[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConversations(
  userId: string | null | undefined,
  conversations: Conversation[],
) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(conversations.slice(0, 40)));
  } catch {
    // Quota or private mode — history is best-effort.
  }
}

export function loadResearchHistory(userId: string | null | undefined): ResearchHistoryEntry[] {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const raw = window.localStorage.getItem(researchKeyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ResearchHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveResearchHistory(
  userId: string | null | undefined,
  entries: ResearchHistoryEntry[],
) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(researchKeyFor(userId), JSON.stringify(entries.slice(0, 30)));
  } catch {
    // Quota or private mode — history is best-effort.
  }
}
