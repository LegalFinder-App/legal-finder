import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { ContentCrudConfig } from "../content-crud-table";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().optional().nullable(),
  category: z.string().min(1, "Category is required"),
  summary: z.string().optional().nullable(),
  body: z.string().min(1, "Body is required"),
  image_url: z.string().optional().nullable(),
  author_name: z.string().optional().nullable(),
  published: z.boolean(),
});

export const adviceConfig: ContentCrudConfig = {
  table: "legal_advices",
  title: "Legal advice",
  description: "Plain-language guides shown in the public Advice hub.",
  queryKey: ["admin-content", "legal_advices"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("legal_advices")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Record<string, unknown>[];
  },
  schema,
  fields: [
    { name: "title", label: "Title", type: "text" },
    { name: "slug", label: "Slug", type: "text", placeholder: "auto-generated if left blank" },
    {
      name: "category",
      label: "Category",
      type: "text",
      placeholder: "e.g. Family, Land, Criminal",
    },
    { name: "summary", label: "Summary", type: "textarea" },
    { name: "body", label: "Body", type: "textarea" },
    { name: "image_url", label: "Image", type: "image" },
    { name: "author_name", label: "Author name", type: "text" },
    { name: "published", label: "Published", type: "boolean" },
  ],
  columns: [
    { key: "title", label: "Title" },
    { key: "category", label: "Category" },
    {
      key: "published",
      label: "Published",
      render: (row) => (row.published ? "Yes" : "No"),
    },
    { key: "updated_at", label: "Updated" },
  ],
  defaultValues: {
    title: "",
    slug: "",
    category: "General",
    summary: "",
    body: "",
    image_url: "",
    author_name: "",
    published: true,
  },
  rowTitle: (row) => String(row.title ?? "Untitled"),
};
