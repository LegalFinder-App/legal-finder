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
scripts/          one-off Node scripts (migrations, icon generation, gradle wrapper, env checks,
                  the store reviewers' demo accounts)
store-listing/    what the app stores ask for: listing text, privacy answers, screenshots and
                  (git-ignored) the demo accounts' sign-in details — start with its README
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
- **PDFs for the apps** are rendered on the server (`src/lib/documents/generate.server.ts`, the
  same react-pdf templates the web renders in the browser), because react-pdf can't run on a
  phone. `pdfkit` must stay in `traceDeps` (`vite.config.ts`): bundled, it can't find its built-in
  fonts. That only shows in a production build, never under `npm run dev` — after touching this,
  run `npm run build && node --env-file=.env .output/server/index.mjs` and generate a document.
- **Payouts**: every advocate-linked payment gets `payout_status = 'pending'` at insert (a DB
  trigger), paid or not. Check `status === 'completed'` before treating a payout as owed —
  `attemptLawyerPayout` does, and nothing else may call Flutterwave.
- **AI features ask first**: the assistant and AI-assisted drafting send what the user types to
  Anthropic, so both sit behind `AiConsentGate` (`src/components/app/ai-consent.tsx`; the app's
  twin is `apps/mobile/src/components/AiConsent.tsx`), with a switch under Settings → Privacy.
  The privacy policy names consent as the basis and App Store guideline 5.1.2(i) requires it. A
  new feature that sends user text to a model goes behind the same gate; if the provider or what
  is sent changes, update the notice, the switch text and the privacy policy together.
- **Account deletion** is one list in three places: what `deprovisionUser()` removes
  (`src/integrations/clerk/deprovisioning.server.ts`), what `/delete-account` tells the public,
  and section 7 of the privacy policy. Change them together — Play's Data safety form links to
  that page.
- **Reporting and blocking** (App Store guideline 1.2) are enforced in the database
  (`20261004120000_reports_and_blocks.sql`, `20261004130000_review_language_filter.sql`). A report
  copies the reported text from the database itself and notifies every admin; admins work through
  them under Admin → Reports (web `admin/reports`, app `ReportsPanel`). A block stops messages
  both ways, and a public review with abusive language is refused. All of it is triggers, not RLS
  policies, because the two Clerk auth migrations recreate the message and review policies on
  every `db:migrate`. The app's entry points: a conversation's ⋮ menu, press-and-hold on a
  message, and the Report link on a review. The Terms promise action on reports within 24 hours —
  the owner's commitment, so don't weaken or extend it without them.
- **Profile photos** live in `profiles.avatar_url` (ImageKit), set by the web and the app alike.
  Clerk's `imageUrl` is only a real photo for social sign-ins (`hasImage`), so the app's session
  prefers the profile's photo; showing Clerk's is why web uploads used to be missing in the app.
- **OAuth**: `signIn.sso({ strategy, redirectUrl, redirectCallbackUrl })` in `src/routes/auth.tsx`.
  Provider credentials for Google/Apple/LinkedIn are configured in the **Clerk Dashboard** (Social
  Connections), not as app env vars — Vercel env vars never reach Clerk's own OAuth exchange.
- **Formatting/lint**: Prettier (100-col, double quotes, trailing commas) + ESLint
  (`eslint.config.js`). `react-refresh/only-export-components` warnings in `components/ui/*` and
  `lib/documents/templates/*` are expected shadcn/PDF-template patterns, not bugs.
- **Comments**: match the existing style — short, explain _why_ (a constraint, a gotcha, a
  cross-file dependency), not _what_. Several files already model this well
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
- `npm run db:migrate -- --only <file>` applies just that one migration. Use it while a pending
  migration is deliberately held back (the push migration, see Known gaps), since a plain run
  applies everything pending.
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
npm test                       # vitest (71 tests as of writing; a "close timed out" warning
                                # after they pass is a benign Vite-server-shutdown quirk)
npm run lint                   # eslint (prettier formatting issues are real but low-priority;
                                # react-refresh warnings noted above are expected)
npm run db:migrate             # apply pending Supabase migrations (see Database above);
                                # -- --only <file> applies a single one
node scripts/reviewer-accounts.mjs [codes|verify|status|remove]   # the store reviewers' demo
                                # accounts on production; "codes" then "verify" before every
                                # submission (store-listing/)

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

| Platform                        | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web                             | Builds clean, tests pass, deployed on Vercel (deployments were blocked 1–2 Oct 2026 by a framework security advisory; fixed by upgrading — see "Deployments" below). The live site's signed-in flows and every `/api/mobile/*` route were re-checked against production on 2026-10-02                                                                                                                                                                                                                                                                                                                                        |
| Android (native, `apps/mobile`) | Signed release AAB (versionCode 10, 2026-10-04 — reporting and blocking, the signed-out welcome screen, the profile-photo fixes; `store-listing/play-upload-build10/`) builds locally with the Play upload key; typecheck/lint/expo-doctor clean, also in CI. The shared screens and sign-in logic have been run for real through the desktop build, but the Android app itself has **not yet been run on a device** (no working emulator here) — needs a real-phone pass                                                                                                                                                    |
| Android (old Capacitor wrapper) | Superseded by the native app; was in Play closed testing up to versionCode 4                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Windows desktop                 | Standalone app (no website loading). Installer builds; sign-in incl. two-step, session restore, sign-out, browser hand-off, documents and account deletion verified by driving the real window against production; payout details, analytics, admin payouts, document generation, the AI permission notice and the store reviewers' sign-in (password, then a backup code) verified the same way. Installer rebuilt 2026-10-02. Unsigned (SmartScreen warns)                                                                                                                                                                 |
| macOS / Linux desktop           | Same app; packaging is configured (`.github/workflows/desktop-build.yml`) but neither has ever been built or run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| iOS (native)                    | Builds on EAS (`@ochienodavid/legalfinder`; certificate, profile and push key are stored there, so `eas build -p ios --non-interactive` works from this machine). iPhone only. App Review held build 2.0.0 (3) on 2026-10-04 under 2.1 "Information Needed" (a recording on a physical device incl. reporting and blocking, purpose, access, services, regions, regulation); the answer and the recording script are in `store-listing/app-review-reply.md`. Build 2.0.0 (4) of 2026-10-04 adds reporting and blocking. **Never run on a device** by us — the owner records the reply's video on their iPhone via TestFlight |

Don't describe platform readiness in marketing/UI copy (e.g. the homepage `PlatformMatrix`
component) more confidently than this table — it was previously overclaimed ("Production-ready
structure" on every card regardless of actual state) and got walked back for exactly that reason.

## Deployments

Vercel deploys `main` on every push. A deployment that fails **within seconds, before the build
starts**, is Vercel refusing a dependency: on 1–2 Oct 2026 it blocked every push because
`@tanstack/react-start` 1.168.49 was affected by CVE-2026-102989 (reflected XSS in server-function
responses; fixed in 1.168.60). The reason is only in the deployment's own log:
`npx vercel ls legalfinder`, then `npx vercel inspect <deployment-url> --logs`. Fix it by
upgrading; don't set the `DANGEROUSLY_DEPLOY_…` override it offers. After a framework upgrade,
check the live site's signed-in flows, not just the build — the server-function transport is what
such fixes change.

## Known gaps (flag if asked, don't silently "fix" by fabricating)

- **Push notifications in the native app** are built but not live (as of 2026-10-02): the push
  migration (`20260930120000_mobile_push_notifications.sql`) hasn't been applied, and Android
  needs Firebase's `google-services.json` plus an FCM key uploaded to Expo. The EAS project now
  exists (id in `apps/mobile/app.config.ts`), so the app's push controls are held back by
  `PUSH_ENABLED` there instead — switch it on only once the rest is in place. Steps:
  `apps/mobile/README.md` ("Push notifications"). Web push is separate and unaffected.
- **The assistant works on production, not from the local `.env`.** The owner replaced the key
  in Vercel on 2026-10-03, and the `claude-opus-5-5` calls were then run for real: through
  `/api/mobile/assistant` and `/api/mobile/documents/draft`, and inside the desktop build (an
  answer, a follow-up in context, a draft edited and saved as a PDF). The `ANTHROPIC_API_KEY` in
  the local `.env` is still the old one Anthropic rejects (401), so a locally run server answers
  "misconfigured (invalid API key)" until it is replaced there too.
- **Production still holds sample content.** The directory's eight advocates are illustrative
  profiles shown as verified (none has an account, so none can be messaged or booked); the three
  wanted notices, five judgements and four news posts are sample content too; no police unit is
  using the police workspace that incident reports go to. Fine for a demo, not for a public
  launch: App Store guideline 2.1 also asks for placeholder content to be removed before review.
  Wanted notices and incident reporting can be switched off in Admin → Settings. Replacing the
  content is the owner's call — don't delete it unasked.
- **Pesapal and Flutterwave have no keys** in `.env` or Vercel, so paying a consultation fee
  fails with "Payments aren't configured yet". Nobody reaches that today, because no listed
  advocate can be booked.
- **App parity is recent and only partly verified.** Payout details, admin payouts, analytics
  and document generation were added to the apps on 2026-10-02 and exercised in the desktop
  build and, for the server routes, against the live site — none of it on a phone. Other
  website-only areas may remain (e.g. passkeys); check before claiming parity.
- **Flutterwave payouts have never moved real money.** The transfer request shape is partly
  inferred (`src/lib/flutterwave.server.ts`, FLUTTERWAVE_SETUP_NOTES) and needs a sandbox pass
  before the Retry button or the automatic payout is relied on.
- **Desktop distribution isn't finished**: installers are unsigned (SmartScreen / Gatekeeper
  warn), there is no auto-update (a new installer per release), and the macOS and Linux builds
  have never been run. Social sign-in and Pesapal checkout hand off to the browser and were tested
  only up to that hand-off, not through a real provider round trip.
- **Store submission content** is drafted in `store-listing/` (listing text, App Privacy and
  Data safety answers, age-rating facts, screenshots, reviewer notes) from what the code does. The
  privacy answers, category, age rating and contact details are declarations the owner makes —
  they are marked **Confirm** there; don't present them as settled, and don't invent the ones
  that are still open. The screenshots were rendered from the desktop build at phone size, not
  captured on a phone.
- **Reporting and blocking buttons are app-only.** The website has Admin → Reports, and the
  database applies a block made in the app everywhere, but the website's own conversations and
  reviews have no Report or Block buttons yet (added 2026-10-04 for App Review, which only sees
  the app).
- **Reviewer demo accounts live on production** (`appreview@legalfinder.co`,
  `appreview-advocate@legalfinder.co`, created by `scripts/reviewer-accounts.mjs`). Their
  matters, messages and documents are sample data; leave them alone unless asked. Their backup
  codes are single-use — `node scripts/reviewer-accounts.mjs codes` before each submission.
- **The Apple developer account is an Individual one.** App Store guideline 5.1.1(ix) wants apps
  that handle sensitive user information submitted by a legal entity, so review may ask for an
  Organization account.
- Demo/seed data (advocate and "wanted persons" photos, judgement text, etc.) is explicitly
  illustrative — see `public/images/profiles/README.md` and the `presentation_dummy_content`
  migration. Don't reuse an existing advocate/client persona photo for an unrelated record (e.g. a
  wanted-suspect entry) — it mislabels that persona. Use a neutral placeholder instead.
