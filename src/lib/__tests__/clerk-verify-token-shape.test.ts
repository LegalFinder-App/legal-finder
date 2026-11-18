import { describe, expect, it } from "vitest";

/**
 * Mirrors auth.server.ts — `@clerk/backend`'s public verifyToken is legacy-wrapped and
 * returns the JwtPayload directly (not `{ data, errors }`). The previous Bearer path only
 * read `.data.sub`, so every successful verify looked like a failed auth.
 */
function userIdFromVerifiedToken(verified: unknown): string | null {
  if (!verified || typeof verified !== "object") return null;
  const record = verified as { sub?: unknown; data?: { sub?: unknown }; errors?: unknown };
  if (record.errors) return null;
  if (typeof record.sub === "string" && record.sub.length > 0) return record.sub;
  if (record.data && typeof record.data.sub === "string" && record.data.sub.length > 0) {
    return record.data.sub;
  }
  return null;
}

describe("Clerk verifyToken payload shapes", () => {
  it("reads sub from the legacy JwtPayload return", () => {
    expect(userIdFromVerifiedToken({ sub: "user_abc", sid: "sess_1" })).toBe("user_abc");
  });

  it("still accepts the { data, errors } shape", () => {
    expect(userIdFromVerifiedToken({ data: { sub: "user_xyz" } })).toBe("user_xyz");
  });

  it("rejects error results", () => {
    expect(userIdFromVerifiedToken({ errors: [{ message: "bad" }] })).toBeNull();
  });
});
