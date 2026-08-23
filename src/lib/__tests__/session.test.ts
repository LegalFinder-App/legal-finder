import { describe, expect, it } from "vitest";
import { initials } from "../session";

describe("initials", () => {
  it("returns the fallback for empty names", () => {
    expect(initials(undefined)).toBe("LF");
    expect(initials("   ")).toBe("LF");
  });

  it("builds initials from the first two words", () => {
    expect(initials("Amina Wanjiku")).toBe("AW");
    expect(initials("john fitzgerald kennedy")).toBe("JF");
  });
});
