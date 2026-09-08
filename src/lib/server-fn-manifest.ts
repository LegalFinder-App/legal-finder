// Every module that calls createServerFn(), imported here purely for its side effect.
//
// TanStack Start's dev server only registers a server function once its file has been
// transformed by the server-side Vite environment — normally that happens the first time
// a route that imports it renders via SSR. This app's whole `_authenticated` route tree sets
// `ssr: false` (src/routes/_authenticated/route.tsx), so files reachable only from there never
// get that SSR-triggered transform, and TanStack's dev-mode fallback recovery for an unknown
// function ID doesn't reliably fix that gap (reproduces every time from a cold dev server,
// independent of caching — same shape as github.com/TanStack/router issues #6423 and #6609).
// Importing every server-fn module here, from src/start.ts (always loaded server-side at boot,
// regardless of ssr:false), forces registration up front so first-call RPCs don't 500.
import "@/lib/assistant.functions";
import "@/lib/imagekit.functions";
import "@/lib/payments.functions";
import "@/lib/clerk-session.functions";
