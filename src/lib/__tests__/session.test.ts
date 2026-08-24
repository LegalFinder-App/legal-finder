import { describe, expect, it } from "vitest";
import { initials, primaryRoleFrom, type AppRole } from "../session";

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

describe("primaryRoleFrom", () => {
  it("returns the role with the highest priority", () => {
    expect(primaryRoleFrom(["user", "lawyer"])).toBe("lawyer");
    expect(primaryRoleFrom(["user", "admin"])).toBe("admin");
    expect(primaryRoleFrom(["lawyer", "police"])).toBe("police");
    expect(primaryRoleFrom(["judiciary", "police"])).toBe("judiciary");
  });

  it("returns user if no recognized roles", () => {
    expect(primaryRoleFrom([])).toBe("user");
  });
});
