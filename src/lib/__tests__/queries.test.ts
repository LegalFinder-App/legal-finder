import { describe, expect, it } from "vitest";
import { unwrap } from "../queries";

describe("unwrap", () => {
  it("returns the data when there is no error", () => {
    expect(unwrap({ data: [1, 2, 3], error: null })).toEqual([1, 2, 3]);
  });

  it("throws when the response has an error", () => {
    expect(() => unwrap({ data: null, error: { message: "boom" } })).toThrow("boom");
  });
});