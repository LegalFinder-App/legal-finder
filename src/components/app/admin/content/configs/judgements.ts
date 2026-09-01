import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { ContentCrudConfig } from "../content-crud-table";
import { blankToNull } from "./field-helpers";

const schema = z.object({
  case_number: z.string().min(1, "Case number is required"),
  title: z.string().min(1, "Title is required"),
  court: z.string().min(1, "Court is required"),
  judge: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  file_url: z.string().optional().nullable(),
  decided_on: blankToNull,
  published: z.boolean(),
});

export const judgementsConfig: ContentCrudConfig = {
  table: "judgements",
  title: "Judgements",
  description: "Court decisions shown in the public Judgements archive.",
  queryKey: ["admin-content", "judgements"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("judgements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Record<string, unknown>[];
  },
  schema,
  fields: [
    { name: "case_number", label: "Case number", type: "text" },
    { name: "title", label: "Title", type: "text" },
    { name: "court", label: "Court", type: "text" },
    { name: "judge", label: "Judge", type: "text" },
    { name: "summary", label: "Summary", type: "textarea" },
    { name: "body", label: "Full text", type: "textarea" },
    { name: "file_url", label: "File URL", type: "text" },
    { name: "decided_on", label: "Decided on", type: "date" },
    { name: "published", label: "Published", type: "boolean" },
  ],
  columns: [
    { key: "case_number", label: "Case #" },
    { key: "title", label: "Title" },
    { key: "court", label: "Court" },
    { key: "published", label: "Published", render: (row) => (row.published ? "Yes" : "No") },
  ],
  defaultValues: {
    case_number: "",
    title: "",
    court: "",
    judge: "",
    summary: "",
    body: "",
    file_url: "",
    decided_on: "",
    published: true,
  },
  rowTitle: (row) => String(row.title ?? row.case_number ?? "Untitled"),
};
