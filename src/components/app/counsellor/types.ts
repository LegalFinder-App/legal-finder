import type { CounsellorAdvocate } from "@/lib/assistant-advocates";
import type { CounsellorAttachment } from "@/lib/assistant-attachments";
import type { CounsellorSource } from "@/lib/assistant-sources";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  /** User-uploaded images/PDFs for this turn. */
  attachments?: CounsellorAttachment[];
  /** LegalFinder sources retrieved for this turn (assistant messages only). */
  sources?: CounsellorSource[];
  /** Verified advocate suggestions for this turn (assistant messages only). */
  advocates?: CounsellorAdvocate[];
};

export type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
  pinned?: boolean;
  messages: ChatMessage[];
};

export type CounsellorMode = "assistant" | "research";

export const PROMPT_CARDS = [
  {
    id: "rights",
    title: "Understand my legal rights",
    prompt: "Explain my basic legal rights in Uganda in plain language.",
  },
  {
    id: "laws",
    title: "Find relevant Ugandan laws",
    prompt: "Which Ugandan laws should I look at for an employment dispute?",
  },
  {
    id: "judgments",
    title: "Explore recent court judgments",
    prompt: "How do I find and read relevant Ugandan court judgments?",
  },
  {
    id: "advocate",
    title: "Find an advocate",
    prompt: "How do I find a verified advocate on LegalFinder for a family matter in Kampala?",
  },
  {
    id: "document",
    title: "Explain a legal document",
    prompt: "What should I check carefully in a retainer agreement before I sign?",
  },
  {
    id: "employment",
    title: "Research an employment dispute",
    prompt: "What are the first steps if my employer dismisses me unfairly in Uganda?",
  },
] as const;

export function newId() {
  return crypto.randomUUID();
}

export function titleFromPrompt(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= 48 ? clean : `${clean.slice(0, 45)}…`;
}
