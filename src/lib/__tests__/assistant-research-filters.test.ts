import { describe, expect, it } from "vitest";
import { DEFAULT_RESEARCH_FILTERS, type CounsellorSource } from "../assistant-sources";

/**
 * Mirror of the server filter predicate for unit coverage without needing Supabase.
 * Keep in sync with matchesFilters() in assistant-sources.server.ts.
 */
function matchesFilters(
  source: CounsellorSource,
  filters: typeof DEFAULT_RESEARCH_FILTERS,
): boolean {
  if (filters.kinds.length > 0 && !filters.kinds.includes(source.kind)) return false;
  if (filters.court && source.court !== filters.court) return false;
  if (filters.category && source.category !== filters.category) return false;

  if (filters.dateFrom || filters.dateTo) {
    if (source.kind === "judgment") {
      if (!source.decidedOn) return false;
      const day = source.decidedOn.slice(0, 10);
      if (filters.dateFrom && day < filters.dateFrom) return false;
      if (filters.dateTo && day > filters.dateTo) return false;
    } else if (source.kind === "library") {
      if (!source.year) return false;
      const fromYear = filters.dateFrom ? Number(filters.dateFrom.slice(0, 4)) : null;
      const toYear = filters.dateTo ? Number(filters.dateTo.slice(0, 4)) : null;
      if (fromYear && source.year < fromYear) return false;
      if (toYear && source.year > toYear) return false;
    } else {
      return false;
    }
  }

  return true;
}

const judgment: CounsellorSource = {
  id: "j1",
  kind: "judgment",
  authority: "judgment",
  title: "Land case",
  subtitle: "High Court",
  summary: null,
  href: "/judgements",
  externalUrl: null,
  court: "High Court",
  decidedOn: "2022-06-15",
  category: null,
  year: null,
  caseNumber: "HCT-1",
};

const guide: CounsellorSource = {
  id: "a1",
  kind: "advice",
  authority: "editorial",
  title: "Employment guide",
  subtitle: "Employment",
  summary: null,
  href: "/advice/employment",
  externalUrl: null,
  court: null,
  decidedOn: null,
  category: "Employment",
  year: null,
  caseNumber: null,
};

describe("research filters", () => {
  it("keeps kinds that are selected", () => {
    expect(
      matchesFilters(judgment, { ...DEFAULT_RESEARCH_FILTERS, kinds: ["judgment"] }),
    ).toBe(true);
    expect(matchesFilters(guide, { ...DEFAULT_RESEARCH_FILTERS, kinds: ["judgment"] })).toBe(
      false,
    );
  });

  it("filters by court and date for judgments", () => {
    expect(
      matchesFilters(judgment, {
        ...DEFAULT_RESEARCH_FILTERS,
        court: "High Court",
        dateFrom: "2022-01-01",
        dateTo: "2022-12-31",
      }),
    ).toBe(true);
    expect(
      matchesFilters(judgment, {
        ...DEFAULT_RESEARCH_FILTERS,
        dateFrom: "2023-01-01",
        dateTo: null,
      }),
    ).toBe(false);
  });

  it("excludes editorial guides when a date filter is active", () => {
    expect(
      matchesFilters(guide, {
        ...DEFAULT_RESEARCH_FILTERS,
        dateFrom: "2020-01-01",
        dateTo: null,
      }),
    ).toBe(false);
  });
});
