/**
 * Locale- and timezone-fixed formatting for anything rendered on the server and again in the
 * browser. `toLocaleDateString()` / `toLocaleString()` follow the machine's locale and zone,
 * which differ between Vercel and a visitor's phone — the text then changes during hydration
 * (React error #418). LegalFinder is Ugandan, so dates use Kampala time and British English.
 */
const LOCALE = "en-GB";
const TIME_ZONE = "Africa/Kampala";

export function formatDate(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
) {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, ...options }).format(
    new Date(value),
  );
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat(LOCALE).format(value);
}
