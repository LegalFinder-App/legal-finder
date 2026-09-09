import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { ContentCrudConfig } from "../content-crud-table";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  body: z.string().min(1, "Body is required"),
  image_url: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  author_name: z.string().optional().nullable(),
  published: z.boolean(),
});

export const newsConfig: ContentCrudConfig = {
  table: "news_posts",
  title: "News",
  description: "Stories shown in the public Newsroom.",
  queryKey: ["admin-content", "news_posts"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("news_posts")
      .select("*")
      .order("published_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Record<string, unknown>[];
  },
  schema,
  fields: [
    { name: "title", label: "Title", type: "text" },
    { name: "slug", label: "Slug", type: "text", placeholder: "auto-generated if left blank" },
    { name: "summary", label: "Summary", type: "textarea" },
    { name: "body", label: "Body", type: "textarea" },
    { name: "image_url", label: "Image", type: "image" },
    { name: "source", label: "Source", type: "text" },
    { name: "author_name", label: "Author name", type: "text" },
    { name: "published", label: "Published", type: "boolean" },
  ],
  columns: [
    { key: "title", label: "Title" },
    { key: "source", label: "Source" },
    { key: "published", label: "Published", render: (row) => (row.published ? "Yes" : "No") },
    { key: "published_at", label: "Published at" },
  ],
  defaultValues: {
    title: "",
    slug: "",
    summary: "",
    body: "",
    image_url: "",
    source: "",
    author_name: "",
    published: true,
  },
  rowTitle: (row) => String(row.title ?? "Untitled"),
};
