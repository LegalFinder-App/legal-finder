import { describe, expect, it } from "vitest";
import { shouldSuggestAdvocates } from "../assistant-advocates.server";

describe("shouldSuggestAdvocates", () => {
  it("detects when the person is looking for representation", () => {
    expect(shouldSuggestAdvocates("Find an advocate in Kampala for a family matter")).toBe(true);
    expect(shouldSuggestAdvocates("I need a lawyer for employment")).toBe(true);
  });

  it("suggests advocates for high-stakes situations even without the word lawyer", () => {
    expect(shouldSuggestAdvocates("What are my rights after an arrest?")).toBe(true);
    expect(shouldSuggestAdvocates("Explain a tenancy notice after eviction threats")).toBe(true);
  });

  it("stays quiet for pure definitions with no representation need", () => {
    expect(shouldSuggestAdvocates("What is a plaint in civil procedure?")).toBe(false);
    expect(shouldSuggestAdvocates("Define habeas corpus briefly")).toBe(false);
  });
});
