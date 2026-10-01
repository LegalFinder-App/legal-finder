import { env } from "./env";

/**
 * Turns a stored image reference into something an app can load. Seeded content uses
 * website-relative paths ("/images/profiles/david.jpg") that only mean something to the website,
 * which serves them; uploads are already full ImageKit URLs.
 */
export function mediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.startsWith("/") ? `${env.apiUrl}${value}` : value;
}
