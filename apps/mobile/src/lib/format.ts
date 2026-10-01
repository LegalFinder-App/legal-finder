export function formatUGX(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `UGX ${Number(amount).toLocaleString("en-UG", { maximumFractionDigits: 0 })}`;
}

/** 1200000 → "1.2M", 45000 → "45K" — for chart axes and stat tiles, which have little room. */
export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  const trim = (n: number) => String(Number(n.toFixed(1)));
  if (abs >= 1_000_000_000) return `${trim(value / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `${trim(value / 1_000_000)}M`;
  if (abs >= 1_000) return `${trim(value / 1_000)}K`;
  return String(Math.round(value));
}

/** "UGX 1.9M" — a full amount ("UGX 1,880,999") wraps in a stat tile on a phone. */
export function formatUGXCompact(amount: number): string {
  return `UGX ${compactNumber(amount)}`;
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "just now", "5m", "3h", "2d", then a date — for chat lists and notifications. */
export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)}h`;
  if (seconds < 7 * 86_400) return `${Math.round(seconds / 86_400)}d`;
  return formatDate(date);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "Size unknown";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
