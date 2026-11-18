import { describe, expect, it } from "vitest";
import { shouldSuggestAdvocates } from "../assistant-advocates.server";

describe("shouldSuggestAdvocates", () => {
  it("detects when the person is looking for representation", () => {
    expect(shouldSuggestAdvocates("Find an advocate in Kampala for a family matter")).toBe(true);
    expect(shouldSuggestAdvocates("I need a lawyer for employment")).toBe(true);
  });

  it("stays quiet for general legal questions", () => {
    expect(shouldSuggestAdvocates("What are my rights after an arrest?")).toBe(false);
    expect(shouldSuggestAdvocates("Explain a tenancy notice")).toBe(false);
  });
});
