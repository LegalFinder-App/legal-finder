// legalfinder://payment-result and legalfinder://sso-callback exist only to close the in-app browser
// (Pesapal checkout; Google/Apple/LinkedIn sign-in) — the code that opened it handles the outcome.
// Android also hands those URLs to the router, which would yank the user off the screen they're on
// mid-flow (e.g. from an advocate's page to Payments), so ignore them while the app is running. On
// a cold start (Android killed the app while the browser was open) there's no flow left to resume,
// and the payment-result / sso-callback routes pick a sensible landing screen instead.
const BROWSER_RETURN_ROUTES = new Set(["payment-result", "sso-callback"]);

function routeOf(path: string): string {
  // "legalfinder://payment-result?status=…" or "/payment-result" → "payment-result"
  const withoutScheme = path.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  return withoutScheme.split(/[?#]/)[0].replace(/^\/+|\/+$/g, "");
}

export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  try {
    if (!initial && BROWSER_RETURN_ROUTES.has(routeOf(path))) return null;
  } catch {
    // Never let link parsing crash the app — fall through to normal routing.
  }
  return path;
}
