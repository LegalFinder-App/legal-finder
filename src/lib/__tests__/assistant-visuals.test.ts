import { describe, expect, it } from "vitest";
import { isSafeHttpsImageUrl, sanitizeCounsellorSvg } from "../assistant-visuals";

describe("Counsellor visuals helpers", () => {
  it("allows only https image URLs", () => {
    expect(isSafeHttpsImageUrl("https://example.com/a.png")).toBe(true);
    expect(isSafeHttpsImageUrl("http://example.com/a.png")).toBe(false);
    expect(isSafeHttpsImageUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects SVG with scripts or event handlers", () => {
    expect(sanitizeCounsellorSvg('<svg xmlns="http://www.w3.org/2000/svg"><circle /></svg>')).toContain(
      "<svg",
    );
    expect(sanitizeCounsellorSvg('<svg onload="alert(1)"></svg>')).toBeNull();
    expect(sanitizeCounsellorSvg("<svg><script>x</script></svg>")).toBeNull();
  });
});
