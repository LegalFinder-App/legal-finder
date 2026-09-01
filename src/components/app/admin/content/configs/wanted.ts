import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { ContentCrudConfig } from "../content-crud-table";
import { optionalNumber } from "./field-helpers";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  alias: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  offence: z.string().optional().nullable(),
  last_seen: z.string().optional().nullable(),
  photo_url: z.string().optional().nullable(),
  reward: optionalNumber,
  danger_level: z.string(),
  status: z.string(),
});

export const wantedConfig: ContentCrudConfig = {
  table: "wanted_persons",
  title: "Wanted persons",
  description: "Notices shown on the public wanted-persons page.",
  queryKey: ["admin-content", "wanted_persons"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("wanted_persons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Record<string, unknown>[];
  },
  schema,
  fields: [
    { name: "name", label: "Name", type: "text" },
    { name: "alias", label: "Alias", type: "text" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "offence", label: "Offence", type: "text" },
    { name: "last_seen", label: "Last seen", type: "text" },
    { name: "photo_url", label: "Photo URL", type: "text" },
    { name: "reward", label: "Reward (UGX)", type: "number" },
    {
      name: "danger_level",
      label: "Danger level",
      type: "select",
      options: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ],
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "wanted", label: "Wanted" },
        { value: "apprehended", label: "Apprehended" },
        { value: "resolved", label: "Resolved" },
      ],
    },
  ],
  columns: [
    { key: "name", label: "Name" },
    { key: "offence", label: "Offence" },
    { key: "danger_level", label: "Danger" },
    { key: "status", label: "Status" },
  ],
  defaultValues: {
    name: "",
    alias: "",
    description: "",
    offence: "",
    last_seen: "",
    photo_url: "",
    reward: "",
    danger_level: "medium",
    status: "wanted",
  },
  rowTitle: (row) => String(row.name ?? "Untitled"),
};
