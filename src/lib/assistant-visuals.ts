/** Shared helpers for Counsellor diagrams / external images (web + tests). */

export function sanitizeCounsellorSvg(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || !/<svg[\s>]/i.test(trimmed)) return null;
  if (/<script|javascript:|on\w+\s*=/i.test(trimmed)) return null;
  if (/<(foreignObject|iframe|embed|object|link|meta)\b/i.test(trimmed)) return null;
  return trimmed;
}

export function isSafeHttpsImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}
