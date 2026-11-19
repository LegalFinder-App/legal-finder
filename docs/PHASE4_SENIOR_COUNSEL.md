# Phase 4 — Senior Uganda counsel behaviour

Counsellor answers like a careful senior guide: citation-first, honest authority labels,
fresher dated material when it matters, and a clear creator credit.

## Behaviour (server)

File: `src/lib/assistant.server.ts`

- **Origin:** created for LegalFinder by **Bitingo Josaphat JB** (`COUNSELLOR_CREATOR`).
- **Citation-first:** prefer attached LegalFinder sources; use `[[cite:KIND:ID]]` only for
  real IDs; never invent Cap./case/bar numbers or profiles.
- **Freshness:** sources are ordered with dated items preferred for the prompt; research mode
  adds an appendix to open with the strongest authorities.
- **Research retrieval:** FTS corpus (`search_legal_chunks`) first; keyword catalogue only if
  FTS is thin.

## Product UI

- Welcome: trust chips, creator line, Updates shortcut, softer brass glow.
- Source rail + citation cards: authority badges, hover hairline, “Original available”.
- Help / settings: citation guidance + founder credit.
- Header copy: “Senior Uganda guide · grounded answers”.

## Eval starter set

`src/lib/__tests__/fixtures/uganda-counsellor-eval.json` — 10 Uganda scenarios (creator,
arrest, employment, land, bail, advocate match, judgments, headlines, retainer, refusal).

Run shape checks:

```bash
npx vitest run --watch=false --pool=forks --fileParallelism=false \
  src/lib/__tests__/uganda-counsellor-eval.test.ts
```

Expand toward 30–50 cases as the corpus grows; fail any live run that invents cites not in
retrieved sources.

## Next (Phase 5)

Ops/trust polish: rate limits, stronger “last verified” chrome, honest marketing copy.
