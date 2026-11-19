import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { COUNSELLOR_CREATOR } from "@/lib/counsellor-meta";
import { extractCitedIds } from "@/lib/assistant-sources";

type EvalCase = {
  id: string;
  question: string;
  expect: Record<string, unknown>;
};

type EvalFixture = {
  version: number;
  creator: string;
  cases: EvalCase[];
};

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures/uganda-counsellor-eval.json",
);

describe("Uganda Counsellor eval fixture", () => {
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as EvalFixture;

  it("credits the founder consistently", () => {
    expect(fixture.creator).toBe(COUNSELLOR_CREATOR);
    expect(fixture.cases.some((c) => c.id === "creator-credit")).toBe(true);
  });

  it("has a useful starter set of Uganda scenarios", () => {
    expect(fixture.cases.length).toBeGreaterThanOrEqual(10);
    expect(fixture.cases.every((c) => c.question.trim().length > 8)).toBe(true);
  });

  it("only accepts well-formed cite tokens from model text", () => {
    const text =
      "See [[cite:advice:abc]] and [[cite:judgment:case-1]] but ignore [[cite:fake:x]] [[cite:advice:]]";
    const cited = extractCitedIds(text);
    expect(cited).toEqual([
      { kind: "advice", id: "abc" },
      { kind: "judgment", id: "case-1" },
    ]);
  });
});
