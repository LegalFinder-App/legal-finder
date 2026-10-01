# AGENTS.md

Instructions for AI coding agents (and future you) working in this repository.

## What this is

LegalFinder is a justice-sector platform for Uganda: a verified-advocate directory, case and
hearing tracking, court judgements search, police incident reporting/wanted notices, a
plain-language legal e-library, and an AI legal assistant. Five roles share one codebase: client,
advocate ("lawyer"), police, judiciary, and admin.

It ships from two client codebases. The **website** (`src/`) runs in the browser/PWA and is the
backend for everything else. The **app** (`apps/mobile/`, Expo / React Native — read
`apps/mobile/README.md` and `apps/mobile/AGENTS.md` first) is the native Android and iOS apps and,
exported for the web and packaged by the Electron shell in `platforms/desktop/`, the Windows, macOS
and Linux apps. None of the apps is a wrapper around the website any more (`platforms/README.md`).
The app uses the same Supabase data/RLS, the same Clerk instance, and the web's `/api/mobile/*`
routes for server-secret operations. When changing a query, a server function or the schema, check
whether the app needs the same change (`apps/mobile/src/lib/queries.ts`, `npm run sync-types` in
`apps/mobile`).

## Tech stack

- **Framework**: TanStack Start (React 19, file-based routing via TanStack Router), Vite, TypeScript.
- **Backend**: Supabase (Postgres + RLS + Storage), migrations in `supabase/migrations/`.
- **Auth**: Clerk (`@clerk/tanstack-react-start`) — not Supabase Auth. Roles live in Supabase's
  `user_roles` table, keyed by Clerk `userId`.
- **Payments**: Pesapal (consultation fees) and Flutterwave (lawyer payouts).
- **AI assistant**: Anthropic SDK (`@anthropic-ai/sdk`).
- **Media**: ImageKit for uploads/transforms.
- **Styling**: Tailwind CSS v4 + shadcn/ui (`src/components/ui/`) + a custom "Chambers" theme
  (ink navy `--ink` / brass `--brass` tokens in `src/styles.css`).
- **Testing**: Vitest.
- **Mobile**: Expo SDK 57 / React Native 0.86 with Expo Router, in `apps/mobile` (Android
  buildable locally; iOS needs a Mac or EAS). The superseded Capacitor wrapper is in
  `platforms/mobile`.
- **Desktop**: Electron + electron-builder, packaging the app's web export — not the website.

## Repo structure

```
src/
  routes/         file-based routes (see src/routes/README.md — read it before adding routes)
    _authenticated/  routes behind Clerk auth; role-gated sub-areas (admin/, practice, precinct, bench, dashboard)
  components/
    ui/           shadcn primitives — don't hand-edit generated-style patterns, follow existing ones
    app/          feature components (admin panels, workspace, settings, platform-matrix, etc.)
    site/         public marketing/site chrome
    common/       shared small pieces (bits, lawyer-card, paginated-list)
  lib/            queries (TanStack Query), rbac, session, toast, payments, assistant, documents
  integrations/   supabase client, clerk server-side provisioning/deprovisioning
supabase/
  migrations/     timestamped SQL migrations — see "Database" below, never edit an applied one
apps/
  mobile/         native iOS/Android app (Expo) — own package.json, README.md and AGENTS.md
platforms/
  mobile/         superseded Capacitor wrapper; still holds store-assets/ (Play Console graphics)
                  and android/keystore.properties (the upload key the native app also signs with)
  desktop/        Electron shell (serves the app's export from disk) + electron-builder config
  shared/         icons and config shared across mobile/desktop
scripts/          one-off Node scripts (migrations, icon generation, gradle wrapper, env checks)
```

## Conventions

- **Routing**: file-based via TanStack Router. Read `src/routes/README.md` first — bare `$` for
  dynamic segments, `_layout.tsx` for layouts, never hand-edit `routeTree.gen.ts`. Don't invent
  `src/pages/` or Next.js-style conventions.
- **Toasts**: import `toast` from `@/lib/toast`, not `sonner` directly — it's a drop-in wrapper
  that also fires native haptics on success/error inside the mobile app shell.
- **Auth/roles**: `AppRole = "user" | "lawyer" | "police" | "judiciary" | "admin"`
  (`src/lib/session.tsx`). Role → home route: user→`/dashboard`, lawyer→`/practice`,
  police→`/precinct`, judiciary→`/bench`, admin→`/admin`. `useSession()` and `rbac.ts`'s
  `loadUserRoles`/`requireRoles` both read the same `userRolesQuery` cache key
  (`["roles", userId]`) — keep it that way so an admin-panel role change invalidates everywhere at
  once (`src/components/app/admin/users-panel.tsx`).
- **Required MFA / session tasks**: the production Clerk instance requires MFA, so every new
  session starts `pending` on a `setup-mfa` task, and Clerk treats pending sessions as **signed
  out** (`useAuth().isSignedIn === false`, server `auth()` unauthenticated). The
  `/session-tasks/setup-mfa` route (mapped via `ClerkProvider taskUrls` in `__root.tsx`) handles
  it. If another task type is ever enabled in Clerk (e.g. `reset-password`,
  `choose-organization`), add a route + `taskUrls` entry for it, or sign-in silently strands users
  on `/auth` again. App Store / Play reviewers also hit this, so any reviewer demo account needs an
  MFA answer.
- **Mobile API**: `src/routes/api.mobile.*.tsx` authenticate with `authenticateClerkRequest()`
  (`src/integrations/supabase/auth.server.ts`, shared with `requireClerkAuth`) and call the same
  `*.server.ts` logic as the web's server functions. Keep server-only imports out of files the
  client bundle can reach — TanStack Start's import protection fails the build otherwise.
- **OAuth**: `signIn.sso({ strategy, redirectUrl, redirectCallbackUrl })` in `src/routes/auth.tsx`.
  Provider credentials for Google/Apple/LinkedIn are configured in the **Clerk Dashboard** (Social
  Connections), not as app env vars — Vercel env vars never reach Clerk's own OAuth exchange.
- **Formatting/lint**: Prettier (100-col, double quotes, trailing commas) + ESLint
  (`eslint.config.js`). `react-refresh/only-export-components` warnings in `components/ui/*` and
  `lib/documents/templates/*` are expected shadcn/PDF-template patterns, not bugs.
- **Comments**: match the existing style — short, explain *why* (a constraint, a gotcha, a
  cross-file dependency), not *what*. Several files already model this well
  (`capacitor.config.ts`, `platform-matrix.tsx`, `queries.ts`).
- **Commits**: end with a `Co-Authored-By: <model> <noreply@anthropic.com>` line naming the model
  that made the change, when an Anthropic agent makes it (see recent history for tone/format).

## Database

- Migrations are timestamped SQL files in `supabase/migrations/`. **Apply them with
  `npm run db:migrate`** (`scripts/apply-migrations.mjs`, talks to Supabase's MCP API) —
  `supabase db push`/`db status` are broken in this environment (Docker/IPv6 issue).
- `db:migrate` skips any migration already recorded as applied (tracked by filename). **Never
  edit an already-applied migration to "fix" it** — the live database won't re-run it. Add a new,
  small follow-up migration instead. It's fine to also fix the original seed file for future fresh
  installs, as long as the live-DB fix is a separate migration.
- Two migrations (`20260908090000_clerk_auth_migration.sql`,
  `20260908110000_clerk_auth_migration_retry.sql`) re-apply on every `db:migrate` run. This is a
  known, harmless quirk of this project's migration tracker — verify actual DB state via
  `pg_policies`/`list_tables`, not by reading the apply log.
- RLS is enforced at the database layer per role, not just in the UI.

## Environment variables

Required (build fails on Vercel without these): `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.

Recommended (feature degrades gracefully, warns at build time if missing — see
`scripts/verify-vercel-env.mjs`): ImageKit (`VITE_IMAGEKIT_URL_ENDPOINT`, `IMAGEKIT_PUBLIC_KEY`,
`IMAGEKIT_PRIVATE_KEY`), assistant (`ANTHROPIC_API_KEY`), Pesapal (`PESAPAL_CONSUMER_KEY`,
`PESAPAL_CONSUMER_SECRET`), Flutterwave (`FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_HASH`),
web push (`VITE_WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`), and `VITE_APP_URL` (falls back to
`https://legalfinder.co` — set explicitly on preview/staging so payment callbacks and mobile
builds don't point at production).

## Commands

```
npm run dev                    # local dev server
npm run build                  # production web build
npm test                       # vitest (23 tests as of writing; a "close timed out" warning
                                # after they pass is a benign Vite-server-shutdown quirk)
npm run lint                   # eslint (prettier formatting issues are real but low-priority;
                                # react-refresh warnings noted above are expected)
npm run db:migrate             # apply pending Supabase migrations (see Database above)

# Native app (apps/mobile) — what ships to the stores. Details: apps/mobile/README.md
cd apps/mobile && npm run typecheck && npm run lint && npx expo-doctor
cd apps/mobile && npx expo prebuild --platform android --clean   # regenerate android/ after
                                # app.config.ts / plugin / native-dependency changes
cd apps/mobile/android && ./gradlew.bat bundleRelease            # signed AAB; needs the
                                # ANDROID_HOME/JAVA_HOME overrides and ~5 GB free disk (README)

# Legacy Capacitor wrapper (platforms/mobile) — superseded by the native app, kept for reference.
# Don't upload its builds: Play has moved on to the native app's version codes.
npm run mobile:sync            # capacitor sync
npm run mobile:android:bundle  # wrapper release AAB (platforms/mobile/android/keystore.properties —
                                # the same upload key the native app signs with)

# Desktop app = Electron shell (platforms/desktop) around the app's web export. Details and the
# dev-server/test switches: platforms/desktop/README.md
npm run desktop:web            # export apps/mobile for the desktop shell → apps/mobile/dist/desktop
npm run desktop:dev            # run the shell against that export
npm run desktop:dist:win       # export + Windows NSIS installer (use :eperm-fix on this machine)
npm run desktop:dist:linux     # export + Linux AppImage/deb (packages here, never run)
npm run desktop:dist:mac       # only produces a real artifact when run on actual macOS
```

Windows-specific: if a Gradle build fails with `JAVA_HOME is set to an invalid directory`, the
system `JAVA_HOME` here points at a JDK's `bin/` subfolder instead of its root — override it for
the one command rather than fixing the system env var (`ANDROID_HOME` isn't set either), e.g. from
`apps/mobile/android`:
`ANDROID_HOME="$LOCALAPPDATA/Android/Sdk" JAVA_HOME="C:/Program Files/Java/jdk-21" ./gradlew.bat bundleRelease`.
Drive C: on this machine has run completely out of space mid-build before ("No space left on
device" from the linker) — check free space first; a clean native build needs ~3 GB of
intermediates.

## Platform status (verified in-session, update as this changes)

| Platform | Status |
|---|---|
| Web | Builds clean, tests pass, deployed on Vercel |
| Android (native, `apps/mobile`) | Signed release AAB (versionCode 6) builds locally with the Play upload key; typecheck/lint/expo-doctor clean; `/api/mobile/*` verified end-to-end against prod Clerk/Supabase. The shared screens and sign-in logic have been run for real through the desktop build, but the Android app itself has **not yet been run on a device** (no working emulator here) — needs a real-phone pass |
| Android (old Capacitor wrapper) | Superseded by the native app; was in Play closed testing up to versionCode 4 |
| Windows desktop | Standalone app (no website loading). Installer builds; sign-in incl. two-step, session restore, sign-out, browser hand-off, documents and account deletion verified by driving the real window against production. Unsigned (SmartScreen warns) |
| macOS / Linux desktop | Same app; packaging is configured (`.github/workflows/desktop-build.yml`) but neither has ever been built or run |
| iOS (native) | Same codebase as Android; needs a Mac or EAS cloud build — not built from this environment |

Don't describe platform readiness in marketing/UI copy (e.g. the homepage `PlatformMatrix`
component) more confidently than this table — it was previously overclaimed ("Production-ready
structure" on every card regardless of actual state) and got walked back for exactly that reason.

## Known gaps (flag if asked, don't silently "fix" by fabricating)

- **Push notifications in the native app** are built but not live (as of 2026-10-01): the push
  migration (`20260930120000_mobile_push_notifications.sql`) hasn't been applied, and a build needs
  an EAS project id plus, for Android, Firebase's `google-services.json` and an FCM key uploaded
  to Expo. Until then the app hides its push controls. Steps: `apps/mobile/README.md` ("Push
  notifications"). Web push is separate and unaffected.
- **The app is a subset of the website.** Payout administration, document automation (PDF
  templates) and the analytics dashboards exist only on the web, so the phone and desktop apps
  don't replace the website for those tasks yet — don't describe them as feature-complete.
- **Desktop distribution isn't finished**: installers are unsigned (SmartScreen / Gatekeeper
  warn), there is no auto-update (a new installer per release), and the macOS and Linux builds
  have never been run. Social sign-in and Pesapal checkout hand off to the browser and were tested
  only up to that hand-off, not through a real provider round trip.
- **Store submission content** (Play Console Data Safety form, content rating questionnaire,
  App Store privacy nutrition label, demo/reviewer account credentials for gated features) needs
  real business/legal input — don't invent answers here.
- Demo/seed data (advocate and "wanted persons" photos, judgement text, etc.) is explicitly
  illustrative — see `public/images/profiles/README.md` and the `presentation_dummy_content`
  migration. Don't reuse an existing advocate/client persona photo for an unrelated record (e.g. a
  wanted-suspect entry) — it mislabels that persona. Use a neutral placeholder instead.
