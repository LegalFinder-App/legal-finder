import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { ContentCrudConfig } from "../content-crud-table";

const schema = z.object({
  text: z.string().min(1, "Quote text is required"),
  author: z.string().min(1, "Author is required"),
});

export const quotesConfig: ContentCrudConfig = {
  table: "quotes",
  title: "Quotes",
  description: "Rotating quote shown on the public home page.",
  queryKey: ["admin-content", "quotes"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Record<string, unknown>[];
  },
  schema,
  fields: [
    { name: "text", label: "Quote", type: "textarea" },
    { name: "author", label: "Author", type: "text" },
  ],
  columns: [
    { key: "text", label: "Quote" },
    { key: "author", label: "Author" },
  ],
  defaultValues: { text: "", author: "" },
  rowTitle: (row) => String(row.author ?? "Untitled"),
};
