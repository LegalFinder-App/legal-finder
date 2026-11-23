import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import type { CounsellorAttachment } from "./assistant-attachments";
import type { AssistantAdvocate, AssistantSource, AssistantWebSource } from "./api";

const PREFIX = "legalfinder.counsellor.v1";
const RESEARCH_PREFIX = "legalfinder.counsellor.research.v1";

export type StoredTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AssistantSource[];
  advocates?: AssistantAdvocate[];
  webSources?: AssistantWebSource[];
  attachments?: CounsellorAttachment[];
};

function chatKey(userId: string) {
  return `${PREFIX}:${userId}`;
}

function researchKey(userId: string) {
  return `${RESEARCH_PREFIX}:${userId}`;
}

export async function loadCounsellorTurns(userId: string | null | undefined): Promise<StoredTurn[]> {
  if (!userId) return [];
  try {
    const raw = await AsyncStorage.getItem(chatKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredTurn[];
    return Array.isArray(parsed) ? parsed.slice(-40) : [];
  } catch {
    return [];
  }
}

export async function saveCounsellorTurns(
  userId: string | null | undefined,
  turns: StoredTurn[],
): Promise<void> {
  if (!userId) return;
  try {
    await AsyncStorage.setItem(chatKey(userId), JSON.stringify(turns.slice(-40)));
  } catch {
    // quota / private mode
  }
}

export async function loadResearchHistoryRaw(userId: string): Promise<string | null> {
  return AsyncStorage.getItem(researchKey(userId));
}

export async function saveResearchHistoryRaw(userId: string, raw: string): Promise<void> {
  await AsyncStorage.setItem(researchKey(userId), raw);
}

export async function clearCounsellorDataForUser(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  await AsyncStorage.multiRemove([chatKey(userId), researchKey(userId)]);
}

/** Opaque id helper for local rows. */
export async function newCounsellorId(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(6);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${Date.now()}-${hex}`;
}
