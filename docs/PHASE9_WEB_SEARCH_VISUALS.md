# Phase 9 — Web search, veracity, and visuals

Counsellor can search the live web (toggle), grade confidence against the LegalFinder corpus, and render Mermaid/SVG diagrams plus cited external images.

## Delivered

- `webSearch` on chat schema, stream route, mobile assistant API
- Anthropic `web_search_20250305` (`max_uses: 5`, Uganda location, direct caller)
- Veracity + visuals system appendix; **Confidence:** High / Mixed / Low when web was used
- `webSources` on replies + `web_sources` SSE event
- Graceful retry if Console has web search disabled
- Web UI: Web search switch (default on in Research, off in Everyday); web citation chips; Mermaid/SVG/images in `AssistantMarkdown`
- Expo: same toggle; Mermaid via WebView/iframe; external images; web chips
- Consent + privacy copy mention Anthropic live web search when the toggle is on

## Trust rules

- LegalFinder corpus wins on conflict; `[[cite:KIND:ID]]` still required for catalogue claims
- Web pages are labelled “verify independently” — never as statute
- Diagrams are illustrative; external images are never verified evidence

## Manual smoke

1. Everyday, Web search off → request has no `tools`
2. Research (default Web search on) → status “Searching the open web…”; Confidence line when used
3. Reply with a ` ```mermaid ` fence → diagram renders on web and desktop shell
4. `![alt](https://…)` from a real search URL → framed “External image · not LegalFinder”
