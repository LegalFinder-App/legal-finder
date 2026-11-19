# Phase 1 — Legal corpus RAG (Anthropic-only)

Anthropic does **not** offer an embeddings API. LegalFinder therefore:

1. **Indexes** published advice / judgments / library text into `legal_chunks` (no third-party embed key).
2. **Retrieves** with Postgres **full-text search** (`search_legal_chunks`).
3. **Answers** with Claude via your existing **`ANTHROPIC_API_KEY`** (optional Haiku keyword expansion for better FTS).

No `OPENAI_API_KEY` is required or recommended.

## 1. Apply SQL (Supabase Dashboard)

Run **both** (in order) if you have not already:

1. `supabase/migrations/20261119200000_legal_chunks_pgvector.sql`  
   (creates `legal_chunks`; `embedding` may stay null)
2. `supabase/migrations/20261119210000_legal_chunks_fts.sql`  
   (adds `search_vector` + `search_legal_chunks`)

Requires Phase 0 `legal_source_registry`.

## 2. Vercel env

| Variable | Purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | Already used for Counsellor answers + optional query expansion |
| `CRON_SECRET` | Protects `/api/cron/legal-index` |

Do **not** add OpenAI keys for this feature.

## 3. First index run

After SQL is applied and the new code is deployed:

Use the **www** host (apex `legalfinder.co` 308-redirects and curl may only show `Redirecting...`).
Paste the real secret from Vercel → Settings → Environment Variables → `CRON_SECRET`
(your local shell usually does **not** have `$CRON_SECRET` set).

```bash
# Replace YOUR_CRON_SECRET with the Vercel value (do not commit it).
curl -sS -H "Authorization: Bearer YOUR_CRON_SECRET" \
  "https://www.legalfinder.co/api/cron/legal-index"
```

A successful run returns JSON like
`{"ok":true,"documents":…,"chunksUpserted":…,"chunksRemoved":…,"errors":[]}`.
`{"error":"Unauthorized"}` means the Bearer secret does not match Vercel’s `CRON_SECRET`.

Nightly cron: `vercel.json` → `/api/cron/legal-index` at 05:15 UTC (Vercel injects the secret automatically).

## 4. What gets indexed

- `legal_advices` (title + summary + body)
- `judgements` (title + summary + body)
- `library_items` (title + author + description)
- Phase 2 also indexes Judiciary/UPF `legal_feed_items` as `news` (see `PHASE2_FEED_CITES.md`)

ULII stays out until a written licence.

## 5. Security

- `legal_chunks` is not a public dump (admin read + service role write).
- Cron is fail-closed without `CRON_SECRET`.
- No prompt/JWT logging in index/retrieve paths.
