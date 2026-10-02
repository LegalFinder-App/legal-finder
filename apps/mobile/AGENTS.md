This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## LegalFinder conventions

- **Three runtimes**: this code runs on Android, on iOS and — exported for the web and packaged by
  `platforms/desktop` — as the Windows/macOS/Linux app. Where a platform API differs, put the
  difference in a `name.ts` / `name.web.ts` pair with identical exports (README: "One codebase,
  three runtimes"), not in `Platform.OS` checks inside screens. Import Clerk only from `@/lib/auth`
  — importing `@clerk/expo` or `@clerk/react` directly in a screen breaks the desktop build's auth
  context. Before calling something done, run it in the desktop shell too
  (`platforms/desktop/README.md`); it needs no device and exercises the shared screens.
- **Stored image paths** may be website-relative (`/images/…`). Always pass them through
  `mediaUrl()` (`src/lib/media.ts`); a bare relative path renders as a blank image in an app.

- **Keyboard**: Android runs edge-to-edge, so the OS no longer resizes the window when the keyboard
  opens — anything near the bottom ends up behind it. Forms go inside `Screen` (its scroll view is
  keyboard-aware) or `AuthScaffold`; bottom-anchored inputs (chat composers, `Sheet`) are wrapped
  in `KeyboardLift`. All of it is `react-native-keyboard-controller` under a root
  `KeyboardProvider`; don't reintroduce React Native's `KeyboardAvoidingView` with iOS-only
  `behavior`.
- **Toasts**: import `toast` from `@/lib/toast` (adds haptics; same shape as the web wrapper), not
  `sonner-native` directly.
- **Data**: `src/lib/queries.ts` mirrors the web's queries against the same RLS policies.
  Anything needing a server secret (payments, payout retry, assistant, upload signing, push
  tokens, account deletion) or that can't run on a phone (PDF generation) goes through the web's
  `/api/mobile/*` routes via `src/lib/api.ts`.
- **Charts and stat tiles**: charts are `src/components/charts` (react-native-svg, so identical on
  all three runtimes) fed by the pure helpers in `src/lib/analytics.ts` — no `Intl`, and buckets
  are keyed by year as well as month. A `StatTile` shares a phone's width with another one: keep
  its label to about a dozen characters and show money with `formatUGXCompact`, the exact figure
  in the hint.
- **Offline cache**: only public query roots (`PUBLIC_QUERY_ROOTS` in `src/lib/query-client.ts`)
  are persisted to disk. Never add cases, messages, documents, payments or profiles to it.
- **Releases**: bump `ANDROID_VERSION_CODE` / `IOS_BUILD_NUMBER` in `app.config.ts` for every
  store upload; see `README.md` for the Windows build environment.
