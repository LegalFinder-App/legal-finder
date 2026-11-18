import { describe, expect, it } from "vitest";
import {
  extractCitedIds,
  resolveSourcesFromText,
  type CounsellorSource,
} from "../assistant-sources";

const sample: CounsellorSource[] = [
  {
    id: "adv-1",
    kind: "advice",
    authority: "editorial",
    title: "Arrest rights",
    subtitle: "Criminal",
    summary: "What to do after an arrest.",
    href: "/advice/arrest-rights",
    externalUrl: null,
    court: null,
    decidedOn: null,
    category: "Criminal",
    year: null,
    caseNumber: null,
  },
  {
    id: "jdg-1",
    kind: "judgment",
    authority: "judgment",
    title: "Example v Uganda",
    subtitle: "High Court",
    summary: "Land dispute summary.",
    href: "/judgements",
    externalUrl: null,
    court: "High Court",
    decidedOn: "2024-01-10",
    category: null,
    year: null,
    caseNumber: "HCT-00-CV-1",
  },
];

describe("extractCitedIds", () => {
  it("collects unique cite tokens in order", () => {
    const text =
      "See [[cite:advice:adv-1]] and again [[cite:advice:adv-1]] plus [[cite:judgment:jdg-1]].";
    expect(extractCitedIds(text)).toEqual([
      { kind: "advice", id: "adv-1" },
      { kind: "judgment", id: "jdg-1" },
    ]);
  });

  it("ignores invented tokens that are not in the protocol", () => {
    expect(extractCitedIds("No cites here [[ref:1]]")).toEqual([]);
  });
});

describe("resolveSourcesFromText", () => {
  it("maps cite tokens back to source records", () => {
    const text = "Guide [[cite:advice:adv-1]] then case [[cite:judgment:jdg-1]].";
    expect(resolveSourcesFromText(text, sample).map((s) => s.id)).toEqual(["adv-1", "jdg-1"]);
  });

  it("skips unknown ids instead of inventing cards", () => {
    const text = "[[cite:advice:missing]] [[cite:judgment:jdg-1]]";
    expect(resolveSourcesFromText(text, sample).map((s) => s.id)).toEqual(["jdg-1"]);
  });
});
