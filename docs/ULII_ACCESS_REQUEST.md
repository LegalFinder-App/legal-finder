# Request for API access to ULII

Ready to send. Contact form / address: https://ulii.org/en/contact/

**Subject:** API access request — LegalFinder (Uganda), with attribution under CC BY-NC 4.0

---

Dear ULII team,

I am **Bitingo Josaphat JB**, founder of LegalFinder (https://legalfinder.co), a Ugandan justice-sector
platform that helps the public find verified advocates, follow court matters, and understand the law
in plain language.

We would like to point our users to Ugandan judgments and legislation on ULII in a more useful way.
We have read your Terms of Use and robots.txt. **We have not scraped or bulk-downloaded anything
from ulii.org, and we will not.** Today we only deep-link to your court listings and search pages.
Our collector code refuses to call ULII until `ULII_ENABLED=true` and an agreed API base/token exist.

We are asking whether you could grant us access to your API (or an agreed data feed) for:

- **Metadata of recent judgments** from the Supreme Court, Court of Appeal, High Court
  (including the Commercial Division and election petitions) and the Industrial Court: case name,
  citation, court, date, judges and your headnote or summary where one exists.
- **Legislation catalogue metadata** (title, citation, year, URL) where your licence permits.
- **Low volume:** one incremental sync a few times a day, cached on our side, with a descriptive
  User-Agent (`LegalFinderFeed/1.0`) and any rate limit you set.

How we would use it:

- Show title, citation, court, date and your summary, with **"Source: ULII (ulii.org), CC BY-NC
  4.0"** and a prominent link to the full judgment **on ULII** — we would not host full judgment
  texts from ULII.
- **No AI processing of ULII full text** unless you expressly allow it: we will respect your
  `ai-input=no` and `ai-train=no` signals. Metadata/headnotes only, as you specify.
- **Commercial question:** LegalFinder is free for the public, but advocates can charge
  consultation fees through it. We would like your confirmation that showing ULII metadata and
  links in that setting fits your licence — or the terms under which it would.

We would be glad to credit ULII prominently, share usage statistics with you, or support your
work in another way. Thank you for considering this — ULII is an invaluable public resource.

Kind regards,

**Bitingo Josaphat JB**  
Founder, LegalFinder  
support@legalfinder.co · https://legalfinder.co

---

## Send checklist (owner)

1. Open https://ulii.org/en/contact/ (or the email they list).
2. Paste the letter above.
3. Keep a copy of their reply in this folder (e.g. `docs/ULII_LICENCE_REPLY.md`) — do not set
   `ULII_ENABLED=true` in Vercel until that reply grants API terms in writing.
4. When licensed: store `ULII_API_BASE` + `ULII_API_TOKEN` as server secrets only; never expose them
   to the browser or mobile apps.
