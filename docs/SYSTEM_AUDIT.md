# LegalFinder system audit (2026-11-20)

Evidence-based pass across auth/SSO, frontend UX, backend/security, and launch readiness.
Sources: in-session SSO fix work; [Frontend UX audit](68aa5f9d-a50f-4f48-b0b3-d93268f85b7c); [Backend security audit](95d08187-08a9-483f-a2be-a3841877b2c4). Pair with `AGENTS.md` Known gaps.

---

## SSO / auth — fixed in this pass (deploy required)

**Symptom:** Sign in → Google/Apple → checks → **login form** → dashboard seconds later.

**Cause:** Protected routes ran before the Clerk **session cookie** was ready → redirect to `/auth` → form painted → client session appeared → workspace.

**Mitigation (local until you push):**

| Piece | Behaviour |
| ----- | ---------- |
| `/sso-callback` | Finalize OAuth; wait for cookie; hard-nav to role home. Failures → `/opening` (OTP is the only path that clears handoff to `/auth`). |
| **`/opening`** (new) | Holding screen only. Retries cookie sync; then one hard-nav to workspace. |
| `/_authenticated` | No userId + `lf:auth-handoff` → `/opening`, not `/auth`. |
| `/auth` | Social on **Sign in** only. Mid-handoff → `/sso-callback` or `/opening`. Absolute OAuth callback URLs. |
| Auth showcase | No longer claims authenticator “two-step” while MFA is off. |

**Clerk Dashboard:** allow `…/sso-callback` and `…/opening` as redirect URLs; prefer them over `/auth` after OAuth.

**Verify after deploy:** provider → `/sso-callback` and/or `/opening` → workspace — not the email form mid-flow.

---

## Critical

| ID | Finding | Action |
| -- | ------- | ------ |
| C-UX1 | Empty client dashboard injects unlabeled `DEMO_CASES` / appointments → links 404 (“Case not found”) | Banner + CTAs, or stop linking demo ids (`client-workspace.tsx`, `demo-data.ts`) |
| C-SEC1 | Clerk auth migrations contain `TRUNCATE` of core tables | Never re-run / `--only` those files on prod; confirm tracker skip; fix AGENTS “re-apply” wording |

---

## High

| ID | Finding | Action |
| -- | ------- | ------ |
| H-UX1 | Web advocate reviews lack Report (app has it) | Port Report on `lawyers.$lawyerId.tsx` |
| H-UX2 | OAuth sets `legalAccepted` without visible checkbox | Post-OAuth terms interstitial |
| H-UX3 | Live courtroom defaults to public Jitsi; bench shows fake “Ready/Synced” | Disclaimer or disable Join; real stats or omit |
| H-UX4 | Mobile Counsellor: no attachments / durable history vs web | Port upload + persisted threads |
| H-SEC1 | AI consent is `localStorage` only; APIs don’t enforce | Persist `ai_consent_at`; 403 if unset |
| H-SEC2 | `payments_client_insert` RLS too loose | Constrain status/amount; prefer RPC insert |
| H-SEC3 | `has_role` executable by `anon` | `REVOKE` from anon |
| H-SEC4 | Flutterwave webhook scheme unverified | Sandbox HMAC/header test before money |
| H-SEC5 | Assistant attachments accept arbitrary HTTPS URLs | Allowlist ImageKit / caller paths |
| L1–L2 | Payments unset; native push not live | Keys + FCM + migration before launch |

---

## Medium

- Design tokens: mobile doesn’t consume `tokens.json` (cream/Public Sans vs web ink/Jakarta).
- Homepage hero overloaded; Platform matrix → `/dashboard`; Counsellor FAB can cover CTAs.
- Marketing sells Counsellor → `/assistant` forces auth (label or teaser).
- Push copy on web while `PUSH_ENABLED = false`.
- Passkeys web-only; OAuth cancel can hang on handoff ~12s.
- Missing `consume_rate_limit` migration (code refs `20261107090000_security_hardening.sql` — file absent) → in-memory limiter only.
- Anon incident-report insert spam; report fan-out to all admins; CSRF only on serverFn.
- `expire_advocate_kyc` granted to `authenticated` (body still role-checks) — revoke from authenticated.
- `VITE_SUPABASE_SERVICE_ROLE_KEY` fallback in `env.ts` — remove footgun.

---

## Low

- Workspace headings bypass fluid type scale; ParticleText hardcodes brass hex; dense public nav.
- Document vault demo labeled “(demo)” but still fills empty vault.
- MFA off; verified lawyers expose email/phone publicly; sample directory content; deprovision keeps case/message history (documented).

---

## What’s working well

- Brand system (ink/brass), AuthShell, cautious PlatformMatrix, Counsellor citations/research on web.
- Web messaging Report/Block present (`messaging-workspace.tsx`) — stronger than older AGENTS notes.
- Clerk JWT → RLS; profile PII locked down; KYC/onboarding SECURITY DEFINER gates; payout re-verify before Flutterwave; mobile API shared auth/Zod/rate hooks; corpus RPCs service_role-only.

---

## Suggested order of work

1. **Push/deploy** SSO + `/opening` and re-test Google on production.  
2. Demo dashboard honesty (C-UX1) + sample content policy.  
3. Server AI consent (H-SEC1) + payment insert tighten (H-SEC2) + revoke `has_role` anon (H-SEC3).  
4. Neutralize TRUNCATE migration ops risk (C-SEC1) + land rate-limit migration (M).  
5. Web review Report + live-courtroom honesty.  
6. Payments keys / Flutterwave sandbox; push; mobile Counsellor parity; store device pass.
