// Server-only. Renders a document template — or AI-drafted text — to a PDF and files it in the
// caller's vault. It is what the web's DocumentGenerator does in the browser
// (src/components/app/documents/document-generator.tsx), done on the server for the app
// (apps/mobile): @react-pdf/renderer can't run on a phone, and rendering here means every
// platform produces the same document from the same templates.
import { createElement, type ReactElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { AppDatabase } from "@/integrations/supabase/app-database";
import { BadRequestError } from "@/lib/mobile-api.server";
import { DOCUMENT_TEMPLATES, DOCUMENT_TEMPLATE_LIST, type DocumentTemplateId } from "./templates";
import { DraftedDocument } from "./templates/drafted-document";

const BUCKET = "documents";

const TEMPLATE_IDS = Object.keys(DOCUMENT_TEMPLATES) as [
  DocumentTemplateId,
  ...DocumentTemplateId[],
];

const caseId = z.string().uuid().nullish();

export const generateDocumentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("template"),
    caseId,
    templateId: z.enum(TEMPLATE_IDS),
    // Field values as the form collected them; the template's own schema validates them below.
    values: z.record(z.string().max(5000)),
  }),
  z.object({
    kind: z.literal("draft"),
    caseId,
    title: z.string().trim().min(1).max(100),
    bodyText: z.string().trim().min(1).max(20000),
  }),
]);

export type GenerateDocumentRequest = z.infer<typeof generateDocumentSchema>;

/** What the app needs to draw each template's form — the PDF layout itself stays here. */
export function listDocumentTemplates() {
  return {
    templates: DOCUMENT_TEMPLATE_LIST.map(({ id, title, description, fields }) => ({
      id,
      title,
      description,
      fields,
    })),
  };
}

function build(request: GenerateDocumentRequest): { fileName: string; element: ReactElement } {
  if (request.kind === "draft") {
    return {
      fileName: request.title,
      element: createElement(DraftedDocument, { title: request.title, bodyText: request.bodyText }),
    };
  }

  const template = DOCUMENT_TEMPLATES[request.templateId];
  const values = Object.fromEntries(
    Object.entries(request.values).map(([name, value]) => [name, value.trim()]),
  );
  const parsed = template.schema.safeParse(values);
  if (!parsed.success) {
    const missing = template.fields.find((f) => f.name === parsed.error.issues[0]?.path[0]);
    throw new BadRequestError(
      missing ? `${missing.label} is required.` : "Fill in the required fields first.",
    );
  }
  return { fileName: template.title, element: template.render(parsed.data) };
}

export async function generateDocument(
  { supabase, userId }: { supabase: SupabaseClient<AppDatabase>; userId: string },
  request: GenerateDocumentRequest,
) {
  const { fileName, element } = build(request);
  // Every template's render() returns a react-pdf <Document>; the shared DocumentTemplate type
  // keeps it a plain ReactElement (see document-generator.tsx).
  const pdf = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);

  // Same object key and row as the web generator writes, through the caller's own RLS-scoped
  // client — so this route can file a document only where the caller could have done it directly.
  const storagePath = `${userId}/${Date.now()}-${fileName.replace(/[^\w.-]+/g, "_")}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, pdf, { upsert: false, contentType: "application/pdf" });
  if (uploadError) {
    console.error("[documents] upload failed", uploadError);
    throw new Error("The document couldn't be saved. Please try again.");
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      owner_id: userId,
      case_id: request.caseId ?? null,
      name: `${fileName}.pdf`,
      storage_path: storagePath,
      mime_type: "application/pdf",
      size_bytes: pdf.byteLength,
      category: "generated",
    })
    .select()
    .single();
  if (error) {
    // Don't leave an orphaned object behind if the row was rejected.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    console.error("[documents] insert failed", error);
    throw new Error("The document couldn't be saved. Please try again.");
  }
  return { document: data };
}
