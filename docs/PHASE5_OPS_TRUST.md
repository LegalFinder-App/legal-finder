# Phase 5 — Ops & trust

Keep Counsellor honest, rate-limited, and visually clear about what a source is.

## Rate limits

| Caller | Bucket | Limit |
| --- | --- | --- |
| Admin → Corpus → Re-index | `corpus_index` (Clerk user) | 4 / hour |
| `/api/cron/legal-index` | `corpus_index` (`cron`) | 4 / hour |

Shared Postgres counter when `consume_rate_limit` is available; in-memory fallback otherwise.
`429` + `Retry-After` on the cron route when limited.

## Source trust chrome

- Citation cards / preview sheet: authority badge, **Dated**, **Last indexed**, Open original.
- Composer trust strip: grounded corpus · links to originals · honest labels · on-device chat.
- Homepage Counsellor blurb: no “scraped law DB” / no ULII scrape claims.

## Takedown path

1. Soft-remove feed rows (`removed_at`) — already in the collector.
2. Unpublish CMS content (Admin → Content), then re-index.
3. Admin → Corpus documents the above under **Takedown & honesty**.

## SQL

Apply after Phase 1–2 FTS. Postgres cannot widen a function’s return row type with
`CREATE OR REPLACE` — if Dashboard returns `42P13`, run the drop follow-up:

1. Prefer: `supabase/migrations/20261119230100_legal_chunks_search_verified_drop.sql`
2. Or the fixed `20261119230000_…` (now includes `DROP FUNCTION` for fresh installs)

Extends `search_legal_chunks` with `published_at` / `updated_at` for UI dates.

## Marketing line (canonical)

> Grounded in LegalFinder’s verified Uganda corpus and live official headlines, with links to
> originals — not a scraped ULII mirror and not an encrypted law database.
