// Pure helpers behind the analytics charts (practice analytics, admin overview). No React and no
// Intl here, so the same numbers come out on Android, iOS and desktop.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface SeriesPoint {
  key: string;
  /** Full label, for the value read-out and screen readers ("Sep 2026", "Sep 19"). */
  label: string;
  /** Short label for the axis ("Sep"). */
  axisLabel: string;
  value: number;
}

type DateOf<T> = (row: T) => string | null | undefined;
type ValueOf<T> = (row: T) => number;

const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
const dayKey = (d: Date) => `${monthKey(d)}-${d.getDate()}`;

function fill<T>(
  buckets: SeriesPoint[],
  keyOf: (d: Date) => string,
  rows: T[],
  dateOf: DateOf<T>,
  valueOf: ValueOf<T>,
): SeriesPoint[] {
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const row of rows) {
    const raw = dateOf(row);
    if (!raw) continue;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) continue;
    // Keyed by year as well as month, so last October's rows can't land in this October's bucket.
    const bucket = byKey.get(keyOf(date));
    if (bucket) bucket.value += valueOf(row);
  }
  return buckets;
}

/** The last `count` calendar months (oldest first), each summing `valueOf` over the rows in it. */
export function monthlySeries<T>(
  rows: T[],
  dateOf: DateOf<T>,
  valueOf: ValueOf<T>,
  count = 6,
  now = new Date(),
): SeriesPoint[] {
  const buckets: SeriesPoint[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    // Day 1, so stepping back from the 31st can't skip a shorter month.
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: monthKey(d),
      label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
      axisLabel: MONTHS[d.getMonth()],
      value: 0,
    });
  }
  return fill(buckets, monthKey, rows, dateOf, valueOf);
}

/** The last `count` days (oldest first, today last), each summing `valueOf` over the rows in it. */
export function dailySeries<T>(
  rows: T[],
  dateOf: DateOf<T>,
  valueOf: ValueOf<T>,
  count = 14,
  now = new Date(),
): SeriesPoint[] {
  const buckets: SeriesPoint[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const label = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    buckets.push({ key: dayKey(d), label, axisLabel: label, value: 0 });
  }
  return fill(buckets, dayKey, rows, dateOf, valueOf);
}

/** How many rows fall under each category, largest first (ties in name order). */
export function countBy<T>(rows: T[], categoryOf: (row: T) => string): SeriesPoint[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const category = categoryOf(row);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return Array.from(counts, ([key, value]) => {
    const label = key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
    return { key, label, axisLabel: label, value };
  }).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

/** Axis ticks from 0 up to a round number at or above `max` (about `target` steps). */
export function niceTicks(max: number, target = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const rough = max / target;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= rough) ??
    10 * magnitude;
  // Counts never need a fractional axis.
  const whole = Math.max(1, Math.ceil(step - 1e-9));
  const ticks: number[] = [];
  for (let value = 0; value < max + whole - 1e-9; value += whole) ticks.push(value);
  return ticks;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * A smooth SVG path through the points that never overshoots them (monotone cubic interpolation,
 * what the web's charts call type="monotone") — a plain spline would dip below zero between two
 * empty months.
 */
export function monotonePath(points: Point[]): string {
  const n = points.length;
  if (n === 0) return "";
  const r = (v: number) => Math.round(v * 100) / 100;
  if (n < 3) return points.map((p, i) => `${i ? "L" : "M"}${r(p.x)} ${r(p.y)}`).join(" ");

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx.push(points[i + 1].x - points[i].x);
    slope.push((points[i + 1].y - points[i].y) / dx[i]);
  }
  const tangent: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i += 1) {
    tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  }
  tangent.push(slope[n - 2]);
  for (let i = 0; i < n - 1; i += 1) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      tangent[i] = t * a * slope[i];
      tangent[i + 1] = t * b * slope[i];
    }
  }

  let d = `M${r(points[0].x)} ${r(points[0].y)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const third = dx[i] / 3;
    d +=
      ` C${r(points[i].x + third)} ${r(points[i].y + tangent[i] * third)},` +
      ` ${r(points[i + 1].x - third)} ${r(points[i + 1].y - tangent[i + 1] * third)},` +
      ` ${r(points[i + 1].x)} ${r(points[i + 1].y)}`;
  }
  return d;
}
