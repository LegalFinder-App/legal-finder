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

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://legalfinder.co/api/cron/legal-index"
```

Nightly cron: `vercel.json` → `/api/cron/legal-index` at 05:15 UTC.

## 4. What gets indexed

- `legal_advices` (title + summary + body)
- `judgements` (title + summary + body)
- `library_items` (title + author + description)

ULII stays out until a written licence.

## 5. Security

- `legal_chunks` is not a public dump (admin read + service role write).
- Cron is fail-closed without `CRON_SECRET`.
- No prompt/JWT logging in index/retrieve paths.
