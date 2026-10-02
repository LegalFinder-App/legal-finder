# LegalFinder — the app (Android, iOS, desktop)

The LegalFinder app, built with **Expo SDK 57** (React Native 0.86, Expo Router, TypeScript). One
codebase ships as:

- the **native Android and iOS apps** — replacing the old Capacitor WebView wrapper in
  `platforms/mobile/`, under the **same package / bundle id (`com.legalfinder.app`) and the same
  Android upload key**, so it installs as an update to the existing Play listing;
- the **Windows, macOS and Linux apps** — the same screens exported for the web
  (`expo export --platform web`) and packaged by the Electron shell in `platforms/desktop/`.

It talks to the same backend as the website:

- **Supabase** directly for data, with the same queries and RLS policies as the web
  (`src/lib/queries.ts` mirrors `../../src/lib/queries.ts`).
- **Clerk** for auth — email/password, sign-up with email codes, required MFA (authenticator
  setup, TOTP/SMS/backup codes), password reset, and Google/Apple/LinkedIn through the system
  browser (Google blocks sign-in inside WebViews). Phones use `@clerk/expo`; the desktop build runs
  Clerk in the same token-based mode (`src/lib/auth-provider.web.tsx`).
- **`/api/mobile/*`** on the web app for anything that needs a server secret or can't run on a
  phone: payments (Pesapal), retrying an advocate's payout (admins), the AI assistant, document
  generation (the web's PDF templates, rendered on the server, plus AI drafting), image-upload
  signing, push-token registration and account deletion. Those routes reuse the web's own server
  logic (`src/lib/*.server.ts`). The app and the website are released separately, so a new route
  must be deployed before an app build that calls it reaches users; until then the app reports
  that the feature isn't available on the server yet (`src/lib/api.ts`).

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

The desktop app runs on any development machine with no device at all — see
`../../platforms/desktop/README.md` ("Running it"). Because it runs the same screens, it is also
the quickest way to see a change to shared code.

## One codebase, three runtimes

Most code is shared. Where a phone API doesn't exist on desktop (or the reverse), the difference
lives in a pair of files — `thing.ts` for phones and `thing.web.ts` for the desktop build, with the
same exports — never in `Platform.OS` checks scattered through screens:

| Shared import            | Phones                              | Desktop (`.web`)                            |
| ------------------------ | ----------------------------------- | ------------------------------------------- |
| `lib/auth`               | `@clerk/expo`                       | `@clerk/react` + a token-mode Clerk instance |
| `lib/secure-store`       | Keychain / Keystore                 | the shell's OS-keychain store               |
| `lib/browser-session`    | in-app browser sheet                | system browser + `legalfinder://` return    |
| `lib/social-sign-in`     | Clerk's `useSSO`                    | the same steps through the system browser   |
| `lib/alert`, `lib/share` | native alert / share sheet          | in-app dialog / copy to clipboard           |
| `lib/files`              | `expo-file-system`, share sheet     | blobs, Save dialog                          |
| `lib/push`               | Expo push                           | not available (controls hidden)             |
| `components/BiometricGate` | Face ID / fingerprint lock        | not available (control hidden)              |
| `components/ui/DateTimeField` | native picker                  | the browser engine's date input             |

Layout adapts through `useWideLayout()` (`lib/layout.ts`): on a wide desktop window
`components/DesktopShell` shows a sidebar instead of the tab bar and content is centred.

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

A clean release build takes one to two hours here (four CPU architectures of native code, on
8 GB of memory); later builds are incremental. Reinstalling `node_modules` makes the next build a
clean one again — each library's Android build output lives inside its package folder. Native (CMake) intermediates go to `~/.cxx-lf/` instead of each module's
`.cxx/` folder — `plugins/withShortNativeBuildPaths.js` does that because the repo's deep path
pushed ninja past Windows' 260-character limit ("build.ninja still dirty after 100 tries"). If
native build errors look stale after a dependency upgrade, delete `~/.cxx-lf/`.

Release builds are signed by `plugins/withReleaseSigning.js` with the upload key in
`../../platforms/mobile/android/keystore.properties` (gitignored — back it up). Bump
`ANDROID_VERSION_CODE` in `app.config.ts` for every Play upload.

Copy the bundle to `release/LegalFinder-<version>-build<versionCode>.aab` (gitignored) before
uploading: `android/` is wiped by the next `prebuild --clean`, and the old wrapper's output in
`platforms/mobile/android/` is also called `app-release.aab` — don't upload that one.

### iOS / cloud builds

iOS can't be built on Windows. EAS Build compiles it on Expo's servers (no Mac needed);
`eas.json` has the profiles. One-time setup, from a terminal in `apps/mobile` — the Apple login is
interactive, so this part can't be scripted:

1. `npx eas-cli@latest login`, then `npx eas-cli@latest init`. Put the project id it prints in
   `EAS_PROJECT_ID` in `.env` (it is also one of the things push needs — below).
2. Give the cloud build the public keys it can't read from your gitignored `.env`: add the four
   `EXPO_PUBLIC_*` values as EAS environment variables for the **production** environment
   (expo.dev → the project → Environment variables, or `eas env` — see
   <https://docs.expo.dev/eas/environment-variables/>). Add `EAS_PROJECT_ID` there too.
3. `npx eas-cli@latest build --platform ios --profile production`. It asks for your Apple
   Developer login and creates (or reuses) the distribution certificate and provisioning profile.
4. `npx eas-cli@latest submit --platform ios` uploads the build to App Store Connect / TestFlight.

After that first build, `.github/workflows/mobile-eas-build.yml` can queue builds from GitHub
(needs the `EXPO_TOKEN` repository secret). Versions come from `app.config.ts`
(`appVersionSource: "local"`): bump `IOS_BUILD_NUMBER` for every upload. Apple's reviewers need a
demo account that can pass two-step verification.

The same profiles build Android in the cloud (`--platform android`) if this machine is short on
disk; upload the existing upload keystore to EAS first (`eas credentials`) so Play accepts it.

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

- **Clerk → Native applications**: the Native API must be enabled, and `legalfinder://sso-callback`
  must be in the allow-list for mobile SSO redirects (needed for Google/Apple/LinkedIn sign-in in
  the phone and desktop apps). Both are in place on the production instance as of 2026-10-01.
- **Clerk → Social connections**: production credentials for Google/Apple/LinkedIn (same as web).
- **Push notifications**: see "Push notifications" above (Expo project, Firebase, migration).

## Structure

```
src/app/          Expo Router screens — (tabs) Home/Advocates/Messages/Learn/More, (auth) flows
src/features/     screen building blocks (home, workspaces per role, admin, content editor)
src/components/   design system (ui/), charts (charts/, drawn with react-native-svg) + shared
                  components
src/lib/          supabase, api, queries, session/roles, push, payments, documents, realtime;
                  *.web.ts files are the desktop counterparts (see "One codebase, three runtimes")
src/theme/        "Chambers" tokens (hex conversions of the web's OKLCH palette) + theme provider
plugins/          config plugins (release signing, short Windows native-build paths, optional
                  Firebase config for Android push)
```

## Security notes

- Only **public** content is persisted to disk for offline use; cases, messages, documents,
  payments and profiles stay in memory and are cleared on sign-out.
- Documents open through short-lived signed URLs; message pushes never include message text.
- Optional Face ID / fingerprint app lock (Settings → Security).
