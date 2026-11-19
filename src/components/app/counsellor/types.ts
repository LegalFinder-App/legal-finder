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
    title: "Understand my rights",
    prompt:
      "Explain my basic legal rights in Uganda in plain language, cite any LegalFinder sources you use, and say when I should speak to a verified advocate.",
  },
  {
    id: "laws",
    title: "Employment dispute",
    prompt:
      "I may have been unfairly dismissed in Uganda. What laws and first steps should I know from LegalFinder sources, and can you suggest a matching advocate?",
  },
  {
    id: "judgments",
    title: "Read a judgment",
    prompt:
      "How do I find and read relevant Ugandan court judgments on LegalFinder, and what should I check before relying on a summary?",
  },
  {
    id: "advocate",
    title: "Find an advocate",
    prompt:
      "Recommend a verified advocate on LegalFinder for a family matter in Kampala, with a short description of why they fit.",
  },
  {
    id: "document",
    title: "Before I sign",
    prompt: "What should I check carefully in a retainer agreement before I sign in Uganda?",
  },
  {
    id: "arrest",
    title: "After an arrest",
    prompt:
      "What are my rights after an arrest in Uganda under the Constitution and related guides on LegalFinder, what should I do next, and who could help?",
  },
] as const;

export function newId() {
  return crypto.randomUUID();
}

export function titleFromPrompt(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= 48 ? clean : `${clean.slice(0, 45)}…`;
}
