import { desktop } from "./desktop";

// Statuses a Response may not be constructed with a body for.
const NO_BODY_STATUS = new Set([204, 205, 304]);

/**
 * fetch() for the two hosts that don't send CORS headers to the desktop app — Clerk's API and the
 * web server's /api/mobile/* routes. There the desktop shell makes the request on the page's
 * behalf (it allows exactly those hosts). On phones there is no CORS and no bridge, so this is
 * plain fetch.
 */
export async function bridgedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (!desktop) return fetch(input, init);

  const request = new Request(input, init);
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let result;
  try {
    result = await desktop.fetch({
      url: request.url,
      method: request.method,
      headers: [...request.headers.entries()],
      body: hasBody ? new Uint8Array(await request.arrayBuffer()) : null,
    });
  } catch {
    // Same failure a page's own fetch reports, so callers' offline handling keeps working.
    throw new TypeError("Failed to fetch");
  }
  return new Response(NO_BODY_STATUS.has(result.status) ? null : (result.body as BodyInit), {
    status: result.status,
    statusText: result.statusText,
    headers: result.headers,
  });
}
