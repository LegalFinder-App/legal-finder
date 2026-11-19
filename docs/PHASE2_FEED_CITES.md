# Phase 2 — Judiciary / UPF headlines as Counsellor sources

Builds on Phase 1 FTS RAG. Official feed aggregation rows become citeable `news`
sources alongside advice, judgments, and library items.

## 1. Apply SQL

In the Supabase SQL editor (after Phase 1 migrations):

`supabase/migrations/20261119220000_legal_chunks_news_kind.sql`

Extends `legal_chunks` checks so `source_kind` / `authority` may be `news`.

## 2. Deploy + re-index

After this code is on Vercel, re-index so feed titles/summaries land in `legal_chunks`:

```bash
# Apex host 308-redirects — use www. Paste the Vercel CRON_SECRET (local shells usually lack it).
curl -sS -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://www.legalfinder.co/api/cron/legal-index"
```

Or open **Admin → Corpus** and click **Re-index corpus**.

## 3. What users get

- Research panel filter **Headlines** (`news`)
- Inline `[[cite:news:…]]` tokens with emerald authority styling
- Citation sheet opens the **original** Judiciary/UPF URL; Updates feed is secondary
- Keyword catalogue + FTS both include live feed items (ULII still excluded)

## 4. Admin health

`/admin/corpus` shows chunk counts by kind, feed item counts, sync state, and the
Phase 0 source registry. Re-index is admin-only (Clerk + `user_roles`).

## 5. Cron note

`curl https://legalfinder.co/api/cron/legal-index` returns plain `Redirecting...`
(HTTP 308 → www). That is **not** a broken route. Use `www.legalfinder.co` and a
real Bearer secret. `{"error":"Unauthorized"}` means the route is live and auth failed.
