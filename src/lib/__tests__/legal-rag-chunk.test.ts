import { describe, expect, it } from "vitest";
import { chunkText, hashContent, stripHtml } from "@/lib/legal-rag/chunk";

describe("legal RAG chunking", () => {
  it("returns a single chunk for short text", () => {
    expect(chunkText("Short judgment summary.")).toEqual(["Short judgment summary."]);
  });

  it("splits long text with overlap and caps volume", () => {
    const long = Array.from({ length: 80 }, (_, i) => `Section ${i + 1} of the Act explains the duty.`).join(
      " ",
    );
    const chunks = chunkText(long, 200, 40);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.length).toBeLessThanOrEqual(40);
    expect(chunks.every((c) => c.length > 0)).toBe(true);
  });

  it("strips HTML before indexing", () => {
    expect(stripHtml("<p>Bail <b>application</b></p><script>x()</script>")).toBe("Bail application");
  });

  it("hashes content stably", () => {
    expect(hashContent(["a", "b"])).toBe(hashContent(["a", "b"]));
    expect(hashContent(["a", "b"])).not.toBe(hashContent(["a", "c"]));
  });
});
