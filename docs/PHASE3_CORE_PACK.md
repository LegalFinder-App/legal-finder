# Phase 3 — Core Uganda statute pack (lawful)

Goal: section-precise citations (`Art. 23`, `s. 4`) for the statutes Counsellor needs most —
without scraping ULII or inventing Act text.

## What ships in code (this phase)

1. **`chunkStatuteText`** — splits Acts/Constitution on Article/Section headings before FTS index.
2. **Indexer** — library items with legislation authority use section chunking; citations per chunk.
3. **Admin → Corpus** — registry already lists `ug-constitution`, `ug-penal-code`, `ug-cpa`,
   `ug-evidence`, `ug-land`, `ug-employment`, `ug-family`, `ug-companies` as `link_only`.
4. **UI** — legislation authority badges stay sky-blue; Research “Library” hits show Cap./section
   when indexed from hosted text.

## What the owner must supply (no invention)

Until you upload a **hostable official PDF / text** (Parliamentary / Judiciary edition you may
store), those `ug-*` rows stay `link_only`. Do **not** flip `host_full_text` without rights.

Checklist per Act:

1. Confirm Cap. number + edition year.
2. Upload via **Admin → Content → Library** (category that maps to legislation: Constitution /
   statute / Act / …).
3. Optionally set registry `host_policy` / `api_status` to `host_full_text` / `active` in a
   follow-up migration once rights are clear.
4. Re-index (Admin → Corpus or www cron).

## Explicitly still blocked

- ULII HTML / API scrape (`ULII_ENABLED` stays off until written licence).
- Claiming “we host the full Penal Code” while rows are `link_only`.

## Next (Phase 4)

Senior-counsel system prompt (creator credit **Bitingo Josaphat JB**), citation-first behaviour,
freshness rules, and a small Uganda eval set.
