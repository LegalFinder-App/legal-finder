/**
 * A 302 whose headers stay mutable. Response.redirect() returns immutable headers, and
 * clerkMiddleware (src/start.ts) appends its auth headers to every response — so a route returning
 * Response.redirect() crashed with "TypeError: immutable" and served a 500 page instead of
 * redirecting (this broke the Pesapal return pages).
 */
export function redirectTo(location: string, status: 301 | 302 | 303 | 307 | 308 = 302): Response {
  return new Response(null, { status, headers: { Location: location } });
}
