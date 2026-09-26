# AGENTS.md

Instructions for AI coding agents (and future you) working in this repository.

## What this is

LegalFinder is a justice-sector platform for Uganda: a verified-advocate directory, case and
hearing tracking, court judgements search, police incident reporting/wanted notices, a
plain-language legal e-library, and an AI legal assistant. Five roles share one codebase: client,
advocate ("lawyer"), police, judiciary, and admin.

It ships from **one shared web app** to four surfaces: browser/PWA, Android, iOS, and desktop
(Windows/macOS/Linux). Mobile and desktop are thin "remote content" shells (Capacitor / Electron)
that load the real deployed site — there is no separate mobile/desktop codebase to keep in sync.
See `platforms/README.md` and `platforms/mobile/README.md` before touching anything under
`platforms/`.

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
- **Mobile**: Capacitor (Android buildable locally; iOS needs a Mac).
- **Desktop**: Electron + electron-builder.

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
platforms/
  mobile/         Capacitor android/ + ios/ projects, store-assets/ (Play Console graphics)
  desktop/        Electron shell + electron-builder config
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
- **OAuth**: `signIn.sso({ strategy, redirectUrl, redirectCallbackUrl })` in `src/routes/auth.tsx`.
  Provider credentials for Google/Apple/LinkedIn are configured in the **Clerk Dashboard** (Social
  Connections), not as app env vars — Vercel env vars never reach Clerk's own OAuth exchange.
- **Formatting/lint**: Prettier (100-col, double quotes, trailing commas) + ESLint
  (`eslint.config.js`). `react-refresh/only-export-components` warnings in `components/ui/*` and
  `lib/documents/templates/*` are expected shadcn/PDF-template patterns, not bugs.
- **Comments**: match the existing style — short, explain *why* (a constraint, a gotcha, a
  cross-file dependency), not *what*. Several files already model this well
  (`capacitor.config.ts`, `platform-matrix.tsx`, `queries.ts`).
- **Commits**: end with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` when an
  Anthropic agent makes the change (see repo's recent commit history for tone/format).

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

npm run mobile:sync            # capacitor sync — run after any capacitor.config.ts/icon change
npm run mobile:android:build   # debug APK
npm run mobile:android:bundle  # signed release AAB (needs platforms/mobile/android/keystore.properties,
                                # gitignored — see platforms/mobile/android/keystore/README.md)
npm run mobile:android:open    # open in Android Studio
npm run mobile:ios:sync        # iOS not buildable on this machine — needs a Mac or
                                # .github/workflows/mobile-ios-build.yml

npm run desktop:dist:win       # Windows NSIS installer (verified working)
npm run desktop:dist:linux     # Linux AppImage/deb (untested locally)
npm run desktop:dist:mac       # only produces a real artifact when run on actual macOS
```

Windows-specific: if a Gradle build fails with `JAVA_HOME is set to an invalid directory`, the
system `JAVA_HOME` here points at a JDK's `bin/` subfolder instead of its root — override it for
the one command rather than fixing the system env var, e.g.
`JAVA_HOME="C:\Program Files\Java\jdk-21" node scripts/run-gradle.mjs bundleRelease`.

## Platform status (verified in-session, update as this changes)

| Platform | Status |
|---|---|
| Web | Builds clean, tests pass, deployed on Vercel |
| Android | Signed release build verified; submitted for Play Console closed testing |
| Windows desktop | Installer build verified |
| macOS / Linux desktop | Not verified from this environment |
| iOS | Not verified from this environment — needs a Mac or a working CI run |

Don't describe platform readiness in marketing/UI copy (e.g. the homepage `PlatformMatrix`
component) more confidently than this table — it was previously overclaimed ("Production-ready
structure" on every card regardless of actual state) and got walked back for exactly that reason.

## Known gaps (flag if asked, don't silently "fix" by fabricating)

- **Push notifications** work on Android/web but not iOS — WKWebView inside a third-party native
  shell doesn't support the Push API. Needs `@capacitor/push-notifications` + APNs/FCM wiring,
  not implemented. See `platforms/mobile/README.md`.
- **Store submission content** (Play Console Data Safety form, content rating questionnaire,
  App Store privacy nutrition label, demo/reviewer account credentials for gated features) needs
  real business/legal input — don't invent answers here.
- Demo/seed data (advocate and "wanted persons" photos, judgement text, etc.) is explicitly
  illustrative — see `public/images/profiles/README.md` and the `presentation_dummy_content`
  migration. Don't reuse an existing advocate/client persona photo for an unrelated record (e.g. a
  wanted-suspect entry) — it mislabels that persona. Use a neutral placeholder instead.
