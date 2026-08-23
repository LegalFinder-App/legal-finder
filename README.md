# LegalFinder

LegalFinder is a production-style justice platform for clients, advocates, police, judiciary, and administrators. The repository is centered on a shared web application built with TanStack Start, React, TypeScript, Supabase, and a polished design system. It now also includes a platform matrix that separates web, mobile, and desktop delivery targets so the codebase can be packaged professionally for browsers, app stores, and desktop installers.

## What this repo contains

- Shared web core for public pages, authenticated workspaces, RBAC, messaging, notifications, cases, documents, and admin audit flows.
- Installable PWA support for browsers on iOS, Android, macOS, Windows, and Linux.
- Platform scaffolding for mobile and desktop release targets under `platforms/`.
- Supabase schema and migrations for auth, roles, realtime messaging, notifications, audit logs, push subscriptions, and legal content.

## Platform structure

- `src/` - shared app source for UI, routes, business workflows, and Supabase integration.
- `platforms/web/` - browser and PWA delivery notes.
- `platforms/mobile/` - iOS and Android packaging notes and wrapper config.
- `platforms/desktop/` - macOS, Windows, and Linux packaging notes and wrapper config.
- `platforms/shared/` - release rules and shared platform contracts.

## Project structure

```text
universal-legal-finder/
├─ public/
│  ├─ favicon.ico
│  ├─ manifest.webmanifest
│  └─ sw.js
├─ platforms/
│  ├─ README.md
│  ├─ shared/
│  ├─ web/
│  ├─ mobile/
│  │  ├─ android/
│  │  └─ ios/
│  └─ desktop/
│     ├─ linux/
│     ├─ macos/
│     ├─ windows/
│     ├─ README.md
│     └─ tauri.conf.json
├─ src/
│  ├─ assets/
│  ├─ components/
│  │  ├─ app/
│  │  ├─ common/
│  │  ├─ site/
│  │  └─ ui/
│  ├─ hooks/
│  ├─ integrations/
│  ├─ lib/
│  ├─ routes/
│  ├─ router.tsx
│  ├─ server.ts
│  └─ start.ts
├─ supabase/
│  ├─ config.toml
│  └─ migrations/
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
└─ README.md
```

The structure above reflects the current repository shape and the intended delivery model: one shared web codebase, with platform-specific release folders layered on top.

## Core product areas

- Authentication and role-based access for clients, advocates, police, judiciary, and admins.
- Advocate directory and legal knowledge library.
- Case tracking, appointments, documents, and notifications.
- Realtime messaging and admin audit trails.
- Live court / hearing workspace support.
- Public content surfaces for advice, news, judgements, safety, stations, and wanted notices.

## Development

Requirements:

- Node.js 20+.
- npm.

Install and run locally:

```sh
npm install
npm run dev
```

Available scripts:

```sh
npm run build   # production build
npm run preview # preview the production build locally
npm run lint    # lint the workspace
npm run format  # format the workspace with Prettier
```

## Environment variables

The app expects Supabase and platform-specific runtime values. Common variables include:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_WEB_PUSH_PUBLIC_KEY`
- `VITE_LIVE_TRIAL_ROOM_BASE_URL`

Keep sensitive service credentials on the server side only.

## Deployment model

The current build is the shared web source of truth. From that base you can:

- Deploy the web app directly.
- Package the app as a PWA for installable mobile and desktop use.
- Add native shells for iOS and Android through a wrapper build.
- Add desktop installers for macOS, Windows, and Linux through a desktop shell.

The platform folders in this repo are intended to grow into those delivery tracks without forcing the shared product logic to diverge.

## Build notes

The repository has already been verified with a successful production build. The app shell, platform matrix, live courtroom panel, and realtime messaging flows all compile against the shared TypeScript web stack.

## Enterprise gaps and next steps

The source tree is in a working state, but the remaining enterprise work is now about hardening and delivery rather than finishing obvious TODO stubs. The highest-value next steps are:

1. Formalize auth and RBAC across every role, including stronger session handling and permission tests.
2. Add automated coverage for realtime messaging, notifications, audit logging, and live courtroom flows.
3. Finish native delivery pipelines for iOS, Android, macOS, Windows, and Linux, including signing and release automation.
4. Add production observability, error reporting, and operational dashboards.
5. Expand localization, accessibility, and performance budgets before wider release.
6. Add server-side push fanout and delivery workers so browser/device registration is backed by a full notification service.
