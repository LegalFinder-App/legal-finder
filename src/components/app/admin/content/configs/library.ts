import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { ContentCrudConfig } from "../content-crud-table";
import { optionalNumber } from "./field-helpers";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().optional().nullable(),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional().nullable(),
  cover_url: z.string().optional().nullable(),
  file_url: z.string().optional().nullable(),
  year: optionalNumber,
});

export const libraryConfig: ContentCrudConfig = {
  table: "library_items",
  title: "Library",
  description: "Statutes, guides and reference texts shown in the public E-library.",
  queryKey: ["admin-content", "library_items"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("library_items")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Record<string, unknown>[];
  },
  schema,
  fields: [
    { name: "title", label: "Title", type: "text" },
    { name: "author", label: "Author", type: "text" },
    { name: "category", label: "Category", type: "text", placeholder: "e.g. Statute, Guide" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "cover_url", label: "Cover image", type: "image" },
    { name: "file_url", label: "File URL", type: "text" },
    { name: "year", label: "Year", type: "number" },
  ],
  columns: [
    { key: "title", label: "Title" },
    { key: "category", label: "Category" },
    { key: "author", label: "Author" },
    { key: "year", label: "Year" },
  ],
  defaultValues: {
    title: "",
    author: "",
    category: "Statute",
    description: "",
    cover_url: "",
    file_url: "",
    year: "",
  },
  rowTitle: (row) => String(row.title ?? "Untitled"),
};
