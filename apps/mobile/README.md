# LegalFinder — native mobile app

A true native iOS/Android app built with **Expo SDK 57** (React Native 0.86, Expo Router,
TypeScript). It replaces the old Capacitor WebView wrapper in `platforms/mobile/`, and ships under
the **same package / bundle id (`com.legalfinder.app`) and the same Android upload key**, so it
installs as an update to the existing Play listing.

It talks to the same backend as the website:

- **Supabase** directly for data, with the same queries and RLS policies as the web
  (`src/lib/queries.ts` mirrors `../../src/lib/queries.ts`).
- **Clerk** (`@clerk/expo`) for auth — email/password, sign-up with email codes, required MFA
  (authenticator setup, TOTP/SMS/backup codes), password reset, and Google/Apple/LinkedIn through
  the system browser (Google blocks sign-in inside WebViews).
- **`/api/mobile/*`** on the web app for anything that needs a server secret: payments (Pesapal),
  the AI assistant, image-upload signing, push-token registration and account deletion. Those
  routes reuse the web's own server logic (`src/lib/*.server.ts`).

## Setup

```bash
cd apps/mobile
npm install
cp .env.example .env        # fill in the public keys (same values as the web's VITE_* keys)
npm run typecheck && npm run lint
```

Types for the database come from the web app — run `npm run sync-types` after any migration.

## Running

Native modules (Clerk, biometrics, notifications…) mean **Expo Go is not enough**; use a
development build:

```bash
npx expo run:android          # builds + installs a dev build on a device/emulator
npx expo run:ios              # macOS only
npx expo start --dev-client   # then iterate with fast refresh
```

## Releasing

### Android (buildable on Windows)

```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew bundleRelease     # set JAVA_HOME to a JDK 17+ root if needed
# → android/app/build/outputs/bundle/release/app-release.aab
```

Release builds are signed by `plugins/withReleaseSigning.js` with the upload key in
`../../platforms/mobile/android/keystore.properties` (gitignored — back it up). Bump
`ANDROID_VERSION_CODE` in `app.config.ts` for every Play upload.

### iOS / cloud builds

Use EAS (no Mac needed): `npx eas-cli@latest init`, then `eas build -p ios` / `eas submit`.
Put the EAS project id in `EAS_PROJECT_ID` (it also enables push notifications).

## One-time dashboard configuration

- **Clerk → Native applications**: enable the Native API, and add `legalfinder://sso-callback`
  to the allowed redirect URLs (needed for Google/Apple/LinkedIn sign-in in the app).
- **Clerk → Social connections**: production credentials for Google/Apple/LinkedIn (same as web).
- **Database**: apply `supabase/migrations/20260930120000_mobile_push_notifications.sql`
  (`npm run db:migrate` from the repo root) — push notifications need it.

## Structure

```
src/app/          Expo Router screens — (tabs) Home/Advocates/Messages/Learn/More, (auth) flows
src/features/     screen building blocks (home, workspaces per role, admin, content editor)
src/components/   design system (ui/) + shared components
src/lib/          supabase, api, queries, session/roles, push, payments, documents, realtime
src/theme/        "Chambers" tokens (hex conversions of the web's OKLCH palette) + theme provider
plugins/          config plugins (release signing)
```

## Security notes

- Only **public** content is persisted to disk for offline use; cases, messages, documents,
  payments and profiles stay in memory and are cleared on sign-out.
- Documents open through short-lived signed URLs; message pushes never include message text.
- Optional Face ID / fingerprint app lock (Settings → Security).
