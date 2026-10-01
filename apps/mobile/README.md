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
cd android && ./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```

On this Windows machine the shell environment needs two overrides for Gradle (the system
`JAVA_HOME` points at a JDK's `bin/` folder, and `ANDROID_HOME` isn't set):

```bash
ANDROID_HOME="$LOCALAPPDATA/Android/Sdk" JAVA_HOME="C:/Program Files/Java/jdk-21" ./gradlew.bat bundleRelease
```

A clean release build takes 30–60 minutes here (four CPU architectures of native code); later
builds are incremental. Native (CMake) intermediates go to `~/.cxx-lf/` instead of each module's
`.cxx/` folder — `plugins/withShortNativeBuildPaths.js` does that because the repo's deep path
pushed ninja past Windows' 260-character limit ("build.ninja still dirty after 100 tries"). If
native build errors look stale after a dependency upgrade, delete `~/.cxx-lf/`.

Release builds are signed by `plugins/withReleaseSigning.js` with the upload key in
`../../platforms/mobile/android/keystore.properties` (gitignored — back it up). Bump
`ANDROID_VERSION_CODE` in `app.config.ts` for every Play upload.

### iOS / cloud builds

Use EAS (no Mac needed): `npx eas-cli@latest init`, then `eas build -p ios` / `eas submit`.
Put the EAS project id in `EAS_PROJECT_ID` (it is also one of the things push needs — below).

### Push notifications (optional)

Until steps 1 and 2 are done the app hides its push controls (`pushAvailable()` in
`src/lib/push.ts`); the in-app notifications list keeps working. Steps 1–3 are build-time settings,
so rebuild (`expo prebuild --clean`, then the release build) after changing any of them.

1. **Expo project** — `npx eas-cli@latest init` in `apps/mobile`, then set `EAS_PROJECT_ID` in
   `.env`. Expo push tokens are issued per project.
2. **Android (FCM)** — in the Firebase console create a project, add an Android app with the
   package `com.legalfinder.app`, and save its `google-services.json` in `apps/mobile/`
   (`plugins/withOptionalGoogleServices.js` picks it up; it holds no secret keys, so it can be
   committed).
   Then upload that Firebase project's **FCM V1 service account key** to Expo: expo.dev → the
   project → Credentials → Android, or `npx eas-cli@latest credentials`.
3. **iOS (APNs)** — `eas build -p ios` / `eas credentials` creates and stores the APNs key.
4. **Database** — apply `supabase/migrations/20260930120000_mobile_push_notifications.sql`
   (`npm run db:migrate` from the repo root). It stores device tokens and forwards each new
   notification and message to Expo's push service.

## One-time dashboard configuration

- **Clerk → Native applications**: enable the Native API, and add `legalfinder://sso-callback`
  to the allowed redirect URLs (needed for Google/Apple/LinkedIn sign-in in the app).
- **Clerk → Social connections**: production credentials for Google/Apple/LinkedIn (same as web).
- **Push notifications**: see "Push notifications" above (Expo project, Firebase, migration).

## Structure

```
src/app/          Expo Router screens — (tabs) Home/Advocates/Messages/Learn/More, (auth) flows
src/features/     screen building blocks (home, workspaces per role, admin, content editor)
src/components/   design system (ui/) + shared components
src/lib/          supabase, api, queries, session/roles, push, payments, documents, realtime
src/theme/        "Chambers" tokens (hex conversions of the web's OKLCH palette) + theme provider
plugins/          config plugins (release signing, short Windows native-build paths, optional
                  Firebase config for Android push)
```

## Security notes

- Only **public** content is persisted to disk for offline use; cases, messages, documents,
  payments and profiles stay in memory and are cleared on sign-out.
- Documents open through short-lived signed URLs; message pushes never include message text.
- Optional Face ID / fingerprint app lock (Settings → Security).
