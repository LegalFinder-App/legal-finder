# Uganda legal corpus inventory (Phase 0)

Owner: **Bitingo Josaphat JB** · LegalFinder  
Last updated: 2026-11-19  
Purpose: decide what we may **host**, what we only **link**, and what waits on a **licence** before RAG (Phase 1+) indexes it.

Authority labels match Counsellor citations: `judgment` | `legislation` | `editorial` | `catalogue` | `news`.

## Host policy legend

| Policy | Meaning |
| --- | --- |
| `host_full_text` | We may store full text/PDF in LegalFinder (own upload or clear licence). |
| `host_metadata` | Title, citation, date, short summary, link — no full body from that source. |
| `link_only` | Deep-link to the original; do not mirror content. |
| `pending_licence` | Do not ingest until written permission exists. |

## Registry (seeded in `legal_source_registry`)

| Slug | Name | Authority | Host policy | Licence / notes | RAG Phase 1? |
| --- | --- | --- | --- | --- | --- |
| `lf-judgements` | LegalFinder judgments | judgment | `host_full_text` | Owner-uploaded / judiciary-supplied PDFs via Admin → Content | Yes (after demo purge) |
| `lf-library` | LegalFinder e-library | legislation / catalogue | `host_full_text` | Owner-uploaded texts; mark category carefully | Yes if rights clear |
| `lf-advice` | LegalFinder advice guides | editorial | `host_full_text` | Our editorial — cite as guide, not statute | Yes (lower authority) |
| `lf-news` | LegalFinder news posts | news | `host_full_text` | Our CMS posts | Optional |
| `feed-judiciary` | Judiciary of Uganda news | news | `host_metadata` | Aggregation only ([SOURCES.md](SOURCES.md)); polite collector | Metadata only |
| `feed-upf` | Uganda Police Force posts | news | `host_metadata` | Aggregation + redaction; no person index | Metadata only |
| `ulii-judgments` | ULII judgments | judgment | `link_only` → later `host_metadata` | **pending_licence** — no scrape; see [ULII_ACCESS_REQUEST.md](ULII_ACCESS_REQUEST.md) | After licence |
| `ulii-legislation` | ULII legislation catalogue | legislation | `link_only` → later `host_metadata` | **pending_licence** | After licence |
| `ug-constitution` | Constitution of Uganda | legislation | TBD | Prefer official PDF we may host; until then link-only / ULII deep-link | Core pack Phase 3 |
| `ug-penal-code` | Penal Code Act | legislation | TBD | Same | Core pack Phase 3 |
| `ug-cpa` | Criminal Procedure Code Act | legislation | TBD | Same | Core pack Phase 3 |
| `ug-evidence` | Evidence Act | legislation | TBD | Same | Core pack Phase 3 |
| `ug-land` | Land Act (and regs) | legislation | TBD | Same | Core pack Phase 3 |
| `ug-employment` | Employment Act | legislation | TBD | Same | Core pack Phase 3 |
| `ug-family` | Family / succession statutes | legislation | TBD | Confirm Cap. numbers before host | Core pack Phase 3 |
| `ug-companies` | Companies Act | legislation | TBD | Same | Core pack Phase 3 |

## Owner decisions still open (do not invent in product copy)

1. **Constitution & major Acts:** confirm which official PDF editions LegalFinder may host vs link. Until then keep `host_policy` as `link_only` or leave `notes` as TBD in the registry.
2. **Demo / sample judgments** on production: replace before claiming “verified corpus” publicly (App Store 2.1 / honesty).
3. **ULII commercial-use** answer: required before `ULII_ENABLED=true`.

## Security / compliance rules (Phase 0 lock)

- Never scrape `ulii.org` HTML or `/api/` without a written API contract.
- Never send ULII full judgment text to Anthropic while `ai-input=no` stands.
- UPF summaries: keep redaction; no name-based wanted-style index from feed text.
- Registry writes: service role + admin only; public may read non-secret catalogue rows (name, authority, attribution).
- Secrets (`ULII_API_TOKEN`, embed keys later): server env only.

## Status

- **Phase 1** — FTS RAG on advice / judgments / library (`PHASE1_RAG.md`).
- **Phase 2** — Judiciary/UPF headlines as `news` cites + Admin → Corpus (`PHASE2_FEED_CITES.md`).
- **Phase 3** — Section-aware statute chunking; `ug-*` stay link-only until hostable PDFs (`PHASE3_CORE_PACK.md`).
- **Phase 4** — Senior-counsel prompt, FTS-first research, creator credit, UI polish (`PHASE4_SENIOR_COUNSEL.md`).
- **Phase 5** — Rate-limited index, citation trust chrome, honest marketing (`PHASE5_OPS_TRUST.md`).
- **Phase 6** — Silicon Valley Counsellor UI craft (`PHASE6_COUNSELLOR_UI.md`).
