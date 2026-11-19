import { describe, expect, it } from "vitest";
import { evaluateUliiGate, uliiFetchAllowed } from "@/lib/legal-feed/ulii-gate";

describe("ULII security gate", () => {
  it("blocks fetch when ULII_ENABLED is unset", () => {
    const result = evaluateUliiGate({});
    expect(result.ok).toBe(false);
    expect(uliiFetchAllowed({})).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/ULII_ENABLED/);
  });

  it("blocks fetch when enabled but credentials missing", () => {
    const result = evaluateUliiGate({ ULII_ENABLED: "true" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/ULII_API/);
  });

  it("still blocks network fetch until the API contract is implemented", () => {
    const result = evaluateUliiGate({
      ULII_ENABLED: "true",
      ULII_API_BASE: "https://api.example.ulii",
      ULII_API_TOKEN: "secret-token",
    });
    expect(result.ok).toBe(false);
    expect(uliiFetchAllowed({
      ULII_ENABLED: "true",
      ULII_API_BASE: "https://api.example.ulii",
      ULII_API_TOKEN: "secret-token",
    })).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/awaiting ULII API contract/);
  });

  it("does not treat ULII_ENABLED=false as enabled", () => {
    expect(
      evaluateUliiGate({
        ULII_ENABLED: "false",
        ULII_API_BASE: "https://x",
        ULII_API_TOKEN: "y",
      }).ok,
    ).toBe(false);
  });
});
