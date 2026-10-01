import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppDatabase } from "@/integrations/supabase/app-database";
import { DOCUMENT_TEMPLATE_LIST } from "../documents/templates";
import {
  generateDocument,
  generateDocumentSchema,
  listDocumentTemplates,
} from "../documents/generate.server";

const USER = "user_test";

/** Records what generateDocument stores; `insertError` makes the documents insert fail. */
function fakeSupabase({ insertError = null as { message: string } | null } = {}) {
  const uploads: { path: string; body: Uint8Array; options: Record<string, unknown> }[] = [];
  const removed: string[][] = [];
  const inserted: Record<string, unknown>[] = [];
  const supabase = {
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, body: Uint8Array, options: Record<string, unknown>) => {
          uploads.push({ path: `${bucket}:${path}`, body, options });
          return { error: null };
        },
        remove: async (paths: string[]) => {
          removed.push(paths);
          return { error: null };
        },
      }),
    },
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => ({
        select: () => ({
          single: async () => {
            if (insertError) return { data: null, error: insertError };
            inserted.push({ table, ...row });
            return { data: { id: "doc-1", ...row }, error: null };
          },
        }),
      }),
    }),
  } as unknown as SupabaseClient<AppDatabase>;
  return { supabase, uploads, removed, inserted };
}

function requiredValues(templateId: string) {
  const template = DOCUMENT_TEMPLATE_LIST.find((t) => t.id === templateId)!;
  return Object.fromEntries(
    template.fields
      .filter((f) => !f.optional)
      .map((f) => [f.name, f.type === "date" ? "2026-10-02" : `Sample ${f.label}`]),
  );
}

describe("listDocumentTemplates", () => {
  it("sends the app each template's form, not its layout code", () => {
    const { templates } = listDocumentTemplates();
    expect(templates.map((t) => t.id)).toEqual(DOCUMENT_TEMPLATE_LIST.map((t) => t.id));
    for (const template of templates) {
      expect(Object.keys(template).sort()).toEqual(["description", "fields", "id", "title"]);
      expect(template.fields.length).toBeGreaterThan(0);
    }
    // Plain data: survives the JSON response unchanged.
    expect(JSON.parse(JSON.stringify(templates))).toEqual(templates);
  });
});

describe("generateDocumentSchema", () => {
  it("accepts both kinds of request, with or without a case", () => {
    const template = { kind: "template", templateId: "retainer_agreement", values: { a: "b" } };
    expect(generateDocumentSchema.safeParse(template).success).toBe(true);
    const draft = {
      kind: "draft",
      caseId: "11111111-1111-4111-8111-111111111111",
      title: "  Demand letter ",
      bodyText: "Text",
    };
    expect(generateDocumentSchema.parse(draft)).toMatchObject({ title: "Demand letter" });
  });

  it.each([
    { kind: "template", templateId: "not_a_template", values: {} },
    { kind: "template", templateId: "retainer_agreement" },
    { kind: "draft", title: "   ", bodyText: "Text" },
    { kind: "draft", title: "T", bodyText: "" },
    { kind: "draft", caseId: "not-a-uuid", title: "T", bodyText: "Text" },
    { kind: "something-else" },
  ])("rejects %j", (request) => {
    expect(generateDocumentSchema.safeParse(request).success).toBe(false);
  });
});

describe("generateDocument", () => {
  // The app can't render these itself, so every template has to work here, in Node.
  it.each(DOCUMENT_TEMPLATE_LIST.map((t) => t.id))(
    "renders %s to a PDF and files it in the caller's vault",
    async (templateId) => {
      const template = DOCUMENT_TEMPLATE_LIST.find((t) => t.id === templateId)!;
      const { supabase, uploads, inserted } = fakeSupabase();
      vi.spyOn(Date, "now").mockReturnValue(1_790_000_000_000);

      const { document } = await generateDocument(
        { supabase, userId: USER },
        { kind: "template", caseId: null, templateId, values: requiredValues(templateId) },
      );
      vi.restoreAllMocks();

      const safeName = template.title.replace(/[^\w.-]+/g, "_");
      expect(uploads).toHaveLength(1);
      expect(uploads[0].path).toBe(`documents:${USER}/1790000000000-${safeName}.pdf`);
      expect(uploads[0].options).toMatchObject({ contentType: "application/pdf", upsert: false });
      expect(Buffer.from(uploads[0].body).subarray(0, 5).toString("latin1")).toBe("%PDF-");
      expect(inserted[0]).toMatchObject({
        table: "documents",
        owner_id: USER,
        case_id: null,
        name: `${template.title}.pdf`,
        storage_path: `${USER}/1790000000000-${safeName}.pdf`,
        mime_type: "application/pdf",
        size_bytes: uploads[0].body.byteLength,
        category: "generated",
      });
      expect(document).toMatchObject({ id: "doc-1", owner_id: USER });
    },
  );

  it("wraps drafted text in a PDF and attaches it to the case", async () => {
    const { supabase, uploads, inserted } = fakeSupabase();
    const caseId = "11111111-1111-4111-8111-111111111111";
    await generateDocument(
      { supabase, userId: USER },
      { kind: "draft", caseId, title: "Demand letter", bodyText: "First.\n\nSecond." },
    );
    expect(Buffer.from(uploads[0].body).subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(inserted[0]).toMatchObject({ case_id: caseId, name: "Demand letter.pdf" });
  });

  it("names the first required field that is missing or blank, and stores nothing", async () => {
    const { supabase, uploads, inserted } = fakeSupabase();
    const values = { ...requiredValues("retainer_agreement"), clientAddress: "   " };
    await expect(
      generateDocument(
        { supabase, userId: USER },
        { kind: "template", templateId: "retainer_agreement", values },
      ),
    ).rejects.toThrow("Client address is required.");
    expect(uploads).toEqual([]);
    expect(inserted).toEqual([]);
  });

  it("removes the uploaded file again if the document row is rejected", async () => {
    const { supabase, uploads, removed } = fakeSupabase({ insertError: { message: "denied" } });
    await expect(
      generateDocument(
        { supabase, userId: USER },
        { kind: "draft", title: "Orphan", bodyText: "Text" },
      ),
    ).rejects.toThrow("The document couldn't be saved.");
    expect(removed).toEqual([[uploads[0].path.replace("documents:", "")]]);
  });
});
