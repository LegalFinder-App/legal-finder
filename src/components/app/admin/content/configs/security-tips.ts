import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { ContentCrudConfig } from "../content-crud-table";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  icon: z.string().optional().nullable(),
});

export const securityTipsConfig: ContentCrudConfig = {
  table: "security_tips",
  title: "Security tips",
  description: "Safety guidance shown on the public Safety page and in the Assistant.",
  queryKey: ["admin-content", "security_tips"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("security_tips")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Record<string, unknown>[];
  },
  schema,
  fields: [
    { name: "title", label: "Title", type: "text" },
    { name: "body", label: "Body", type: "textarea" },
    { name: "icon", label: "Icon (lucide name)", type: "text", placeholder: "e.g. ShieldCheck" },
  ],
  columns: [
    { key: "title", label: "Title" },
    { key: "icon", label: "Icon" },
  ],
  defaultValues: { title: "", body: "", icon: "" },
  rowTitle: (row) => String(row.title ?? "Untitled"),
};
