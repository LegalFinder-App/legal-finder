# LegalFinder

LegalFinder is a justice-sector platform for Uganda. In one place it offers a directory of
verified advocates, case and hearing tracking, court judgements, police incident reporting and
wanted notices, a plain-language legal library, and an AI legal assistant.

- **Website**: [legalfinder.co](https://www.legalfinder.co). It can also be installed as a PWA.
- **Apps**: native Android and iOS apps, plus Windows, macOS and Linux desktop apps (see
  [Platforms](#platforms) for what has shipped and what has been tested).

## Who it's for

Five roles share one codebase, and each has its own workspace after sign-in:

| Role                    | Home         | What they do there                                                                             |
| ----------------------- | ------------ | ---------------------------------------------------------------------------------------------- |
| Client (`user`)         | `/dashboard` | Find and book advocates, follow their matters and appointments, message, ask the assistant     |
| Advocate (`lawyer`)     | `/practice`  | Matters, clients, deadlines, documents, live hearings, consultation fees and payouts           |
| Police (`police`)       | `/precinct`  | Work through the queue of incident reports; wanted notices                                     |
| Judiciary (`judiciary`) | `/bench`     | Hearing calendar, live courtroom, published judgements                                         |
| Admin (`admin`)         | `/admin`     | Users and roles, applications, verifications, reports, payouts, content, settings, audit trail |

Anyone can sign up as a client. Advocate, police and judiciary accounts are granted only after an
admin approves an application that includes the required documents.

## Features

- **Advocate directory**: verified profiles, practice areas, fees, client reviews, and booking a
  consultation, with the fee paid through Pesapal.
- **Matters**: case tracking with notes, deadlines, documents, appointments, and live video
  hearings (Jitsi by default).
- **Documents**: PDF templates (power of attorney, retainer agreement, service contract) and
  AI-assisted drafting.
- **AI legal assistant**: built on Anthropic's Claude. The assistant and AI drafting both ask for
  the user's consent before anything is sent to Anthropic, and the user can turn this off under
  Settings → Privacy.
- **Public information**: court judgements, legal advice, the e-library, news, police stations,
  safety tips, wanted notices and incident reporting. Admins can turn the last two off.
- **Messaging and notifications**: realtime messages, in-app notifications, web push, and a daily
  job that sends licence/CPD and case-deadline reminders.
- **Payouts**: Flutterwave pays an advocate automatically once their client's payment completes.
- **Safety**: users can report content and block other users, and reviews with abusive language
  are refused. These rules are enforced in the database. Admins work through reports under
  Admin → Reports.
- **Account deletion**: done in the app or on the website. [/delete-account](https://www.legalfinder.co/delete-account)
  explains what is removed.

## How it fits together

```
 Browsers / PWA ─────► Website  (src/ · TanStack Start on Vercel)
                        ▲    │
          /api/mobile/* │    └──► Anthropic · Pesapal · Flutterwave · ImageKit
                        │
 Android · iOS ──────► App  (apps/mobile · Expo / React Native)
 Windows · macOS ·
 Linux (Electron)

 Website and app both use: Supabase (Postgres, RLS, Storage, Realtime) · Clerk (sign-in, MFA)
```

There are two client codebases and one backend:

- **The website** (`src/`) is built with TanStack Start and deployed on Vercel. Its
  `/api/mobile/*` routes also serve the apps whenever an operation needs a server secret, such as
  payments, the assistant, PDF generation, upload signing or account deletion.
- **The app** (`apps/mobile/`) is built with Expo / React Native and ships as the Android and iOS
  apps. Exported for the web and packaged inside an Electron shell, it is also the desktop app.
  None of the apps loads the website; each one is self-contained.

Both talk to the same Supabase database and the same Clerk instance. Roles are stored in
Supabase's `user_roles` table under the Clerk user ID, and access is enforced by row-level security
in the database as well as in the UI.

## Tech stack

| Area      | What's used                                                                               |
| --------- | ----------------------------------------------------------------------------------------- |
| Website   | TanStack Start (React 19, TanStack Router and Query), Vite, TypeScript                    |
| Styling   | Tailwind CSS v4, shadcn/ui, the "Chambers" theme (ink navy and brass) in `src/styles.css` |
| Data      | Supabase: Postgres with RLS, Storage, Realtime                                            |
| Auth      | Clerk, with MFA required on production; Google, Apple and LinkedIn sign-in                |
| AI        | Anthropic SDK (`@anthropic-ai/sdk`)                                                       |
| Payments  | Pesapal (consultation fees), Flutterwave (advocate payouts)                               |
| Media     | ImageKit                                                                                  |
| PDFs      | `@react-pdf/renderer`, in the browser and on the server                                   |
| App       | Expo SDK 57, React Native 0.86, Expo Router                                               |
| Desktop   | Electron, electron-builder                                                                |
| Tests, CI | Vitest, ESLint, Prettier, GitHub Actions                                                  |

## Repository layout

```text
universal-legal-finder/
├─ src/                    the website
│  ├─ routes/              file-based routes; read routes/README.md before adding one
│  │  ├─ _authenticated/   signed-in areas: dashboard, practice, precinct, bench, admin/, …
│  │  └─ api.*.tsx         /api/mobile/*, payment callbacks, webhooks, the daily cron job
│  ├─ components/          ui/ (shadcn), app/ (workspaces, admin), site/, common/
│  ├─ lib/                 queries, RBAC, session, payments, assistant, documents, …
│  └─ integrations/        Supabase clients, Clerk provisioning and deprovisioning
├─ apps/mobile/            the app: Android, iOS and desktop (own package.json and README)
├─ platforms/
│  ├─ desktop/             Electron shell and installer configuration
│  ├─ web/                 notes on the web deliverable
│  ├─ shared/              icon sources for every platform
│  └─ mobile/              the old Capacitor wrapper (superseded); still holds Play store assets
├─ supabase/migrations/    timestamped SQL migrations
├─ scripts/                migration runner, env check, icon generation, reviewer accounts, …
├─ store-listing/          App Store and Google Play submission kit
├─ public/                 static files, PWA manifest, service worker, icons
├─ AGENTS.md               conventions, gotchas and detailed status, for contributors and AI agents
└─ vercel.json             cron schedule and security headers
```

## Getting started

You need **Node.js 20.19 or newer** (CI uses Node 22) and npm.

```sh
npm install
cp .env.example .env   # then fill in the values (see below)
npm run dev            # open the address Vite prints
```

To work on the app, follow [apps/mobile/README.md](apps/mobile/README.md). The quickest way to see
the app running without a phone is the desktop build:

```sh
npm run desktop:web    # export the app for the desktop shell
npm run desktop:dev    # open it in the Electron shell
```

### Environment variables

These go in `.env` locally and in Vercel's project settings for deployments.
`scripts/verify-vercel-env.mjs` checks them on every Vercel build.

| Variable                                                                    | Needed for                                                                                          |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`                        | **Required.** Database access                                                                       |
| `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`                            | **Required.** Sign-in                                                                               |
| `SUPABASE_SERVICE_ROLE_KEY`                                                 | Server-side admin work (provisioning, deletion, cron). Server only                                  |
| `VITE_APP_URL`                                                              | Payment callbacks and links. Defaults to `https://legalfinder.co`, so set it on preview deployments |
| `VITE_IMAGEKIT_URL_ENDPOINT`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY` | Image uploads                                                                                       |
| `ANTHROPIC_API_KEY`                                                         | The assistant and AI drafting                                                                       |
| `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`, `PESAPAL_ENV`            | Consultation payments                                                                               |
| `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_HASH`, `FLUTTERWAVE_ENV`     | Automatic advocate payouts                                                                          |
| `VITE_WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`                          | Web push notifications                                                                              |
| `CRON_SECRET`                                                               | Lets Vercel's daily reminder job call `/api/cron/compliance-check`                                  |
| `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`                             | `npm run db:migrate` only                                                                           |

`.env.example` has notes on most of these. It doesn't list the Clerk keys, which come from the
Clerk Dashboard under API keys. Only `VITE_*` values reach the browser, so never give a secret a
`VITE_` prefix. The app has its own `apps/mobile/.env.example`, which holds only public
keys.

## Commands

```sh
# Website
npm run dev                  # development server
npm run build                # production build
npm run preview              # serve the production build
npm test                     # Vitest
npm run lint                 # ESLint, including Prettier formatting

# Database
npm run db:migrate           # apply pending migrations in supabase/migrations/
npm run db:migrate -- --only <file>   # apply a single migration

# App (run from apps/mobile; details in its README)
npm run typecheck && npm run lint && npx expo-doctor
npm run sync-types           # copy the database types over after a migration

# Desktop (details in platforms/desktop/README.md)
npm run desktop:web          # export the app for the desktop shell
npm run desktop:dev          # run the shell against that export
npm run desktop:dist:win     # Windows installer (EPERM error? use desktop:dist:win:eperm-fix)
npm run desktop:dist:linux   # AppImage and .deb
npm run desktop:dist:mac     # only works on macOS

# Store submissions
node scripts/reviewer-accounts.mjs codes    # fresh backup codes for the reviewers' demo accounts
node scripts/reviewer-accounts.mjs verify   # check that both accounts can still sign in
```

## Database

Migrations are timestamped SQL files in `supabase/migrations/`. Apply them with
`npm run db:migrate`, which goes through Supabase's management API. `supabase db push` has not
worked for this project because of a Docker/IPv6 issue. Once a migration has been applied, don't
edit it. The runner skips migrations it has
already recorded, so a fix has to go in a new migration. See the Database section of
[AGENTS.md](AGENTS.md#database) for the details.

## Deployment and CI

- **Website**: every push to `main` deploys to Vercel. `vercel.json` sets the security headers
  (including a strict CSP) and schedules the compliance-reminder job daily at 06:00 UTC.
- **CI** (`.github/workflows/`):
  - `quality.yml` runs on every push and pull request. It lints, tests and builds the website,
    then typechecks and lints the app.
  - `desktop-build.yml` builds the desktop installers on GitHub's runners when a `desktop-v*` tag
    is pushed, or when started by hand. This is the only way to get a macOS build without a Mac.
  - `mobile-eas-build.yml` starts an EAS cloud build of the app. It only runs when started by
    hand.
- **Android**: built locally as a signed AAB (see [apps/mobile/README.md](apps/mobile/README.md)).
- **iOS**: built on EAS, because iOS builds need a Mac.
- **Store listings**: [store-listing/](store-listing/README.md) holds the listing text, privacy
  answers, screenshots and reviewer notes.

## Platforms

This table describes the state as of 5 October 2026. [AGENTS.md](AGENTS.md#platform-status-verified-in-session-update-as-this-changes)
holds the detailed record, so update it there first.

| Platform      | Status                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Web           | Live on Vercel; signed-in flows and every `/api/mobile/*` route checked against production                                           |
| Android       | Signed release bundle (version 2.0.0, build 13) built for Play. Not yet run on a physical phone                                      |
| iOS           | Builds on EAS; the latest is 2.0.0 (6). On 4 October App Review held build 3 and asked for more information. Not yet run on a device |
| Windows       | Installer builds and the main flows were checked in the real app against production. Installer is unsigned (SmartScreen warns)       |
| macOS / Linux | Packaging is configured, but neither has been built or run yet                                                                       |

## Known gaps

These are not finished. Don't describe them as done in the UI or in marketing copy.

- **Payments are not configured.** There are no Pesapal or Flutterwave keys, so paying a
  consultation fee fails with a clear message. Flutterwave payouts have never moved real money
  and need a sandbox run first.
- **Production still holds sample content.** The eight directory advocates, the wanted notices,
  judgements and news posts are illustrative. App Store review expects placeholder content to be
  removed before launch.
- **Push notifications in the app** are built but switched off until the push migration is
  applied and Firebase is set up. Web push is unaffected.
- **Report and Block buttons are app-only.** The database enforces blocks everywhere, but the
  website's own conversations and reviews don't have the buttons yet.
- **Desktop distribution** has unsigned installers and no auto-update.

## Further reading

| Document                                                   | What's in it                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                                     | Conventions, gotchas, detailed platform status, and the full list of known gaps |
| [src/routes/README.md](src/routes/README.md)               | Routing conventions                                                             |
| [apps/mobile/README.md](apps/mobile/README.md)             | Setting up, running and releasing the app                                       |
| [platforms/README.md](platforms/README.md)                 | How the six targets relate                                                      |
| [platforms/desktop/README.md](platforms/desktop/README.md) | The desktop shell, running it, building installers                              |
| [store-listing/README.md](store-listing/README.md)         | App Store and Play submission kit, reviewer demo accounts                       |
