# Phase 7 — Mobile / desktop Counsellor citation parity

Bring the Expo app (and therefore the desktop shell) in line with web Counsellor trust chrome.

## Delivered

- `AssistantSource` supports `news` + authority `news`, plus date / external URL fields from the API
- Grounded / general guidance pill on assistant turns
- Richer source cards: authority tint, index, court/date, Open original (in-app browser)
- Cite tokens rendered as `[n]` in Markdown; news opens the official URL
- Creator credit + honest trust line under the composer
- Thinking copy mentions LegalFinder retrieval

## Shared stack

Mobile still calls `/api/mobile/assistant` → the same `runAssistant()` as the website (FTS-first
RAG, senior-counsel prompt, Bitingo Josaphat JB origin).
