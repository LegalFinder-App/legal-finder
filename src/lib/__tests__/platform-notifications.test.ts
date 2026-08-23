import { describe, expect, it } from "vitest";
import { urlBase64ToUint8Array } from "../platform-notifications";

describe("urlBase64ToUint8Array", () => {
  it("decodes a base64url string into bytes", () => {
    const bytes = urlBase64ToUint8Array("SGVsbG8td29ybGQ_");

    expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111, 45, 119, 111, 114, 108, 100, 63]);
  });
});
