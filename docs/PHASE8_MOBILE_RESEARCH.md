# Phase 8 — Mobile Research mode (Expo parity)

Bring Legal Research (the website’s split research pane) to the Expo app / desktop shell.

## Delivered

- `/api/mobile/assistant/research` — same FTS corpus search as `/api/assistant/research`
- Mobile `api.searchResearch` + `askAssistant(..., { mode: "research" })`
- Mobile assistant route now forwards `mode` / `attachments` into `runAssistant`
- Everyday / Research segmented control on Counsellor
- Phone: Research workbench (search, kind chips, court/category/date filters, results + preview)
- Wide (desktop shell): chat + research split
- Preview sheet actions: Ask Counsellor about this, Open original, Use topic in chat
- Research history cached in AsyncStorage
- `researchRequestSchema.kinds` max raised to 4 (all source kinds)

## Shared stack

Search and chat still hit the website’s server logic (`searchLegalResearch`, `runAssistant`) over Bearer Clerk auth.
