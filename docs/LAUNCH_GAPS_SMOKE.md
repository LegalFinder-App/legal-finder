# Launch gaps — smoke checklist

After applying migrations and deploying:

## Database

```bash
npm run db:migrate -- --only 20261107090000_security_hardening.sql
npm run db:migrate -- --only 20261123130000_ai_consent.sql
npm run db:migrate -- --only 20261123140000_payments_insert_hardening.sql
npm run db:migrate -- --only 20261119240000_advocate_kyc_renewal.sql
```

(Needs `SUPABASE_ACCESS_TOKEN` or `supabase login`.)

## Web

- [ ] Empty client dashboard shows CTAs — no `/cases/demo-*` links
- [ ] Lawyer profile: Report on someone else's review
- [ ] Live courtroom: Join disabled with no video hearing; disclaimer visible
- [ ] Bench tiles show numeric counts (not "Ready"/"Synced")
- [ ] Without AI consent, `/api/assistant/stream` returns 403; after Allow, works
- [ ] Booking a paid consult uses `create_consultation_payment` RPC

## Mobile (Android / iOS / desktop export)

API base: `EXPO_PUBLIC_API_URL` → `https://www.legalfinder.co` (`apps/mobile/src/lib/api.ts`).

All `/api/mobile/*` routes are wired: session, assistant (+ stream + research), payments/initiate,
uploads/image-auth, push register/unregister, account/delete, payouts/retry, documents
templates/generate/draft.

- [ ] Counsellor: attach photo/PDF (size must be > 0), send, kill app, reopen — thread restored
- [ ] Research works without AI consent (corpus only); assistant/draft still gated
- [ ] Sign-out / delete account clears Counsellor local history
- [ ] Video hearing Join shows third-party (Jitsi) disclaimer
- [ ] Passkey buttons visible; work only after Clerk native + EAS rebuild
- [ ] Booking paid consult uses `create_consultation_payment` then `/api/mobile/payments/initiate`

## Still out of scope

Pesapal/Flutterwave keys, sample content replacement, native push (`PUSH_ENABLED`).
