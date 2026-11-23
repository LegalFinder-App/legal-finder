# LegalFinder system audit (2026-11-20, updated 2026-11-23)

Evidence-based pass across auth/SSO, frontend UX, backend/security, and launch readiness.
Pair with `AGENTS.md` Known gaps and `docs/LAUNCH_GAPS_SMOKE.md`.

---

## Closed in launch-gaps pass (2026-11-23)

| ID | Status |
| -- | ------ |
| C-UX1 | Done — empty dashboard uses CTAs; no demo case links |
| H-UX1 | Done — web review Report via `ReportDialog` |
| H-UX3 | Done — courtroom disclaimer; Join only with real video hearing; bench numeric stats |
| H-UX4 | Done — mobile Counsellor attachments + per-user durable turns/research |
| H-SEC1 | Done — `profiles.ai_consent_at` + API 403 (`requireAiConsent`) |
| H-SEC2 | Done — `create_consultation_payment` RPC; direct INSERT closed |
| Rate limit | Done — `20261107090000_security_hardening.sql` (`consume_rate_limit`) |
| Passkeys (mobile) | Code wired; Clerk Dashboard + native build still required |
| KYC apply | Migration present; run `db:migrate -- --only 20261119240000_…` on live |
| `expire_advocate_kyc` grant | Restricted to `service_role` in hardening migration |

---

## Mobile UI parity (2026-11-23)

Android/iOS theme resynced to web ink/brass (`apps/mobile/src/theme/tokens.ts` ← `tokens.json`):
cool slate background, deep brass `#956809`, Plus Jakarta Sans, 12px radius base. Counsellor
welcome/composer match web prompt cards + trust strip. Same Supabase project + Clerk instance as
web (see `apps/mobile/.env.example`); rebuild the APK/AAB to pick up fonts and colours.

## Still open

| ID | Finding |
| -- | ------- |
| C-SEC1 | Clerk auth migrations contain `TRUNCATE` — never `--only` those on prod |
| H-UX2 | OAuth `legalAccepted` without visible checkbox |
| H-SEC3 | `has_role` executable by `anon` |
| H-SEC4 | Flutterwave webhook scheme unverified |
| H-SEC5 | Assistant attachment URL allowlist |
| L1–L2 | Pesapal/Flutterwave keys; native push not live |
| Sample content | Production demo advocates / judgements / wanted notices |

---

## What’s working well

- Brand system (ink/brass), SSO hard-nav (deployed), Counsellor citations/research on web.
- Web messaging Report/Block; web review Report; server AI consent; payment RPC.
- Clerk JWT → RLS; KYC/onboarding SECURITY DEFINER gates.
