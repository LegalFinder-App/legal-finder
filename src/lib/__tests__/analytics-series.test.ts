import { describe, expect, it } from "vitest";
import { dailySeries, monthlySeries } from "../analytics-series";

const at = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month, day, hour).toISOString();
const count = () => 1;

describe("monthlySeries", () => {
  it("names six different months even when today is the 31st", () => {
    // Stepping back with setMonth() from 31 March lands on 3 March for February, so the old
    // charts showed March twice and no February.
    const months = monthlySeries([], () => null, count, 6, new Date(2026, 2, 31, 15));
    expect(months).toHaveLength(6);
    expect(new Set(months.map((m) => m.label)).size).toBe(6);
  });

  it("counts a row only in its own month and year", () => {
    const now = new Date(2026, 9, 2, 12);
    const rows = [
      { at: at(2026, 9, 1), amount: 100 },
      { at: at(2026, 8, 30, 23), amount: 40 },
      { at: at(2025, 9, 1), amount: 9999 }, // last October: not this October's revenue
      { at: at(2026, 4, 15), amount: 7 }, // the oldest month in the window
      { at: at(2026, 3, 30), amount: 5000 }, // the month before the window
      { at: null, amount: 1 },
      { at: "not a date", amount: 1 },
    ];
    const series = monthlySeries(
      rows,
      (r) => r.at,
      (r) => r.amount,
      6,
      now,
    );
    expect(series.map((m) => m.value)).toEqual([7, 0, 0, 0, 40, 100]);
  });
});

describe("dailySeries", () => {
  it("covers the last fourteen days, across a month boundary, ending today", () => {
    const now = new Date(2026, 9, 2, 12);
    const rows = [
      { at: at(2026, 9, 2, 0) },
      { at: at(2026, 8, 19, 23) }, // the first day in the window
      { at: at(2026, 8, 18) }, // the day before it
      { at: at(2025, 9, 2) }, // this date last year
    ];
    const series = dailySeries(rows, (r) => r.at, count, 14, now);
    expect(series).toHaveLength(14);
    expect(new Set(series.map((d) => d.label)).size).toBe(14);
    expect(series[0].value).toBe(1);
    expect(series[13].value).toBe(1);
    expect(series.reduce((sum, d) => sum + d.value, 0)).toBe(2);
  });
});
