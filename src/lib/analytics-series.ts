// Time buckets for the analytics charts (practice analytics, admin overview). Kept out of the
// components so the bucketing can be tested: the charts used to key buckets by month *name*,
// which counted last October's rows into this October and, stepping back from the 31st, named
// one month twice and skipped another. apps/mobile/src/lib/analytics.ts is the app's copy.

export interface SeriesBucket {
  label: string;
  value: number;
}

type Keyed = SeriesBucket & { key: string };
type DateOf<T> = (row: T) => string | null | undefined;
type ValueOf<T> = (row: T) => number;

const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
const dayKey = (d: Date) => `${monthKey(d)}-${d.getDate()}`;

function fill<T>(
  buckets: Keyed[],
  keyOf: (d: Date) => string,
  rows: readonly T[],
  dateOf: DateOf<T>,
  valueOf: ValueOf<T>,
): SeriesBucket[] {
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const row of rows) {
    const raw = dateOf(row);
    if (!raw) continue;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) continue;
    const bucket = byKey.get(keyOf(date));
    if (bucket) bucket.value += valueOf(row);
  }
  return buckets.map(({ label, value }) => ({ label, value }));
}

/** The last `count` calendar months (oldest first), each summing `valueOf` over its rows. */
export function monthlySeries<T>(
  rows: readonly T[],
  dateOf: DateOf<T>,
  valueOf: ValueOf<T>,
  count = 6,
  now = new Date(),
): SeriesBucket[] {
  const buckets: Keyed[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    // Day 1, so stepping back from the 31st can't land in the wrong month.
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: monthKey(d),
      label: d.toLocaleDateString(undefined, { month: "short" }),
      value: 0,
    });
  }
  return fill(buckets, monthKey, rows, dateOf, valueOf);
}

/** The last `count` days (oldest first, today last), each summing `valueOf` over its rows. */
export function dailySeries<T>(
  rows: readonly T[],
  dateOf: DateOf<T>,
  valueOf: ValueOf<T>,
  count = 14,
  now = new Date(),
): SeriesBucket[] {
  const buckets: Keyed[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    buckets.push({
      key: dayKey(d),
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: 0,
    });
  }
  return fill(buckets, dayKey, rows, dateOf, valueOf);
}
