# Legal intelligence feed — source discovery

Checked on 2026-11-08 with a handful of requests, at least 4 s apart, identified as
`LegalFinderFeedDiscovery/0.1 (+https://legalfinder.co/contact)`. Nothing was bulk-downloaded.

## Summary

| Source | Access method | Allowed? | Notes |
| --- | --- | --- | --- |
| Uganda Police Force (upf.go.ug) | WordPress REST API (preferred) or RSS | Yes, with care | robots.txt allows everything; the site's "Terms" and "Privacy" pages are the WordPress theme vendor's boilerplate, not UPF's |
| Judiciary of Uganda (judiciary.go.ug) | Server-rendered HTML listing + article pages | Yes, with care | No robots.txt (404), no terms page linked; no feed, no caching headers |
| ULII (ulii.org) | **Licensed API only — no scraping** | Not until ULII grants access | Terms prohibit scraping and bulk download; robots.txt disallows `/judgments/` and `/api/` and signals `ai-input=no`; content is non-commercial only |

## Uganda Police Force — upf.go.ug

- **robots.txt** (Yoast): `User-agent: * / Disallow:` — nothing disallowed. Sitemap: `/sitemap_index.xml`.
- **Terms/Privacy:** `/terms-conditions/` and `/privacy-policy-2/` are copied from the theme
  vendor MysteryThemes (theme subscriptions, refunds, theme support). UPF publishes **no terms of
  its own**: nothing forbids automated access, but nothing grants reuse either. We should
  therefore stick to aggregation (headline, date, short excerpt, link) and ideally tell UPF's
  communications office what we do.
- **WordPress REST API — open, preferred:**
  - Posts: `GET /wp-json/wp/v2/posts?per_page=20&_fields=id,date,modified,link,title,categories,excerpt`
    returns JSON with ISO dates (`2026-11-06T11:01:11`, site-local, East Africa Time).
  - Categories: `GET /wp-json/wp/v2/categories?per_page=100&_fields=id,name,slug,count`
  - Filter by category: `&categories={id}`; incremental sync: `&modified_after={iso}` or `&after=`.
- **RSS:** `/feed/` (RSS 2.0, `lastBuildDate`), per category `/category/{slug}/feed/` — fallback.
- **Categories (slug → post count on 2026-11-08):** `press-release` 1049, `community-policing` 221,
  `traffic-alert` 96, `crime-operations` 83, `sports` 57, `regional-international-cooperation` 37,
  `transfersappointments` 21, `public-saftey` 14 (sic), `latest-posts` 2243 (catch-all),
  `uncategorized` 1.
- **Quirks:** excerpts are HTML with `[&hellip;]`; titles are often ALL CAPS (normalise for
  display); many posts name suspects and victims — redaction needed before storing (see
  "Personal data").
- **Update frequency:** several posts a day. Proposed sync: every 30 min, one request per run
  (`modified_after` the last seen timestamp).

## Judiciary of Uganda — judiciary.go.ug

- **robots.txt:** none (404) — no stated restriction. **No terms, disclaimer or privacy page is
  linked** from the homepage or news listing; footer shows only "© 2026".
- **Stack:** static/server-rendered HTML under `/data/…` (a Joomla-era RSS-scroller stylesheet is
  still referenced; no JSON API, no RSS/Atom feed found). Content is in the HTML, no JavaScript
  rendering needed.
- **Sections:**
  - News listing: `/data/press/news.html` (≈ 12 latest stories, one request).
  - Article: `/data/news/{section}/{id}/{Title}.html` — the numeric `{id}` is a stable key.
  - Publications: `/data/publications/`; cause lists: `/data/causelist/{courtId}/{Court Name}.html`.
- **Dates:** the listing has **no per-item dates**. Article pages show `Posted 27th, October 2026`
  (ordinal day, comma, full month). So a new item costs one extra request for its page — only for
  ids we haven't seen.
- **Summaries:** `<meta name="description">` is a generic site line ("Today in the Judiciary, High
  Court of Uganda") — useless. Summary = first 2–3 sentences of the article body, trimmed.
- **Caching:** no `ETag` / `Last-Modified` headers, so conditional requests don't help; we hash the
  listing and skip work when it hasn't changed.
- **Update frequency:** a few stories a week. Proposed sync: every 2 h (1 listing request + 1 per
  new story).

## ULII — ulii.org

- **Terms of use** (`/en/terms-of-use/`), quoted: "Scraping and bulk downloading from this website
  is strictly prohibited. We are a donor-funded organisation…" and "Please email us if you would
  like to access our data in bulk." Access is "through the website, or … through our APIs".
- **Licence:** works may be re-used "provided you credit ULII as your source and your use is not
  for commercial gain"; some collections (e.g. national case law) may carry more permissive
  licences.
- **robots.txt:** `Disallow: /judgments/`, `/gazettes/`, `/api/`, `/accounts/` …; `Crawl-delay: 5`;
  content signals `search=yes, ai-input=no, ai-train=no`.
- **Consequences for us:**
  1. No crawler, no HTML parsing of ulii.org — ever.
  2. `UliiAdapter` stays behind `ULII_ENABLED=false` until ULII grants API access in writing.
  3. **No AI summaries of ULII text** (`ai-input=no`), even with access — only ULII's own
     headnotes/metadata.
  4. **Commercial use question:** LegalFinder charges consultation fees, so "not for commercial
     gain" needs ULII's explicit confirmation for our use (see `docs/ULII_ACCESS_REQUEST.md`).
- **Until then:** deep links only, labelled "View on ULII":
  `https://ulii.org/en/judgments/{UGSC|UGCA|UGHC|UGCommC|UGIC|UGHCEP}/` and
  `https://ulii.org/en/search/?q={query}`.

## Personal data (Data Protection and Privacy Act, 2019)

- UPF posts routinely name suspects, victims and sometimes minors. Store only headline, date,
  category, link and a short redacted summary — never a person index, people search or name-based
  alerts.
- Redaction pass on summaries: drop sentences mentioning sexual offences or minors' names/ages;
  replace named individuals in those sentences.
- Every item gets a "Report a concern / request removal" link; items removed at the source are
  marked removed and hidden at the next sync.

## Decisions needed from the owner

1. **UPF and Judiciary:** proceed with headline + short summary + link aggregation, given neither
   publishes terms? (Recommended, plus a courtesy note to each communications office.)
2. **ULII:** send the access request (draft in `docs/ULII_ACCESS_REQUEST.md`), including the
   commercial-use question.
3. **Summaries:** first-sentences extraction (no AI, deterministic) — recommended — or AI
   summaries for UPF/Judiciary only (would go behind the existing AI-consent rules).
