# Phase: Advanced advocate KYC (in-house + renewal + vendor hooks)

Shipped as hybrid **1C**: strict in-house review now; narrow provider interface for a later
NIRA / liveness vendor. Renewal **2A**: when the practising certificate expires, the listing
loses `verified` until the advocate re-uploads and an admin re-approves.

## What “Verified” means

Directory **Verified** means an administrator approved an application (or PC renewal) with a
**current** practising certificate — not a one-click toggle. The Admin → Verifications panel is
status-only; approve / renew under **Applications**.

Do not claim NIRA or Judiciary API verification in product copy until a vendor is live.

## Schema / RPCs

Migration: `supabase/migrations/20261119240000_advocate_kyc_renewal.sql`

| Piece | Notes |
| ----- | ----- |
| `lawyers` KYC columns | `practising_certificate_number`, `enrolment_certificate_ref`, `kyc_status`, `kyc_verified_at`, `kyc_expires_at`, `kyc_application_id`, optional `kyc_vendor` / `kyc_vendor_ref` |
| Requirements | First-time advocate: + `national_id_number`, `national_id_back`, `selfie`. Renewal (`details.purpose = 'renewal'`): PC number/expiry + NIN + PC file + selfie |
| Checklist gate | `review_role_application` refuses lawyer approve unless required `review_checks` keys are true |
| Verify lock | Trigger: `verified = true` only with `app.kyc_verify_ok` (set by the review RPC) or `service_role` |
| `start_advocate_kyc_renewal()` | Resets the advocate’s unique `role_applications` row to a renewal draft |
| `expire_advocate_kyc()` | Unverifies expired PCs, sets `kyc_status=expired`, `accepting_clients=false`, notifies |

Apply:

```bash
npm run db:migrate -- --only 20261119240000_advocate_kyc_renewal.sql
```

## Applicant UX

- Web: `/apply` — NIN field, ID back, selfie (`capture=user` preferred).
- Mobile: same requirements; selfie opens camera first.
- Practice home (web + Expo): banner when `kyc_status` is expired / PC within 30 days → **Renew practising certificate**.

## Admin UX

- Web Applications: auto-checks + mandatory checklist (incl. selfie); identity block shows NIN + selfie beside ID.
- Mobile Applications: same checklist; Approve disabled until required ticks are set (DB enforces too).
- Verifications: KYC status / PC expiry; link to Applications; no verify toggle.

## Vendor hook

`src/lib/kyc/provider.ts` (mobile twin under `apps/mobile/src/lib/kyc/`). Called from
`submitApplication` after uploads; today always `{ status: "skipped" }`. Swap
`getKycProvider()` when wiring a vendor + env keys — no schema change required.

## Expiry job

Daily compliance cron (`src/lib/compliance-check.server.ts`) calls `expire_advocate_kyc` first,
then sends 30/7/1-day PC reminders.

## Smoke checklist

1. New advocate apply with NIN + selfie + ID back → submit.
2. Admin cannot approve without checklist → tick all → approve → listing `verified`, `kyc_status=verified`.
3. Verifications panel cannot set `verified` (trigger error if attempted via API).
4. Force `bar_license_expires_at` to yesterday → run compliance / `expire_advocate_kyc` → unverified + notify.
5. Practice banner → renew → admin approve → verified again.
6. Confirm privacy / delete-account still cover onboarding bucket (NIN + selfie paths under `onboarding/<userId>/`).

## Tests

- `src/lib/__tests__/verification.test.ts` — checklist includes selfie; renewal-aware helpers.
- `src/lib/__tests__/onboarding-kyc.test.ts` — requirements / missingItems for first-time vs renewal.
