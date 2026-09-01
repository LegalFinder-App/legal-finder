import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { ContentCrudConfig } from "../content-crud-table";
import { optionalNumber } from "./field-helpers";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  county: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  latitude: optionalNumber,
  longitude: optionalNumber,
});

export const stationsConfig: ContentCrudConfig = {
  table: "police_stations",
  title: "Police stations",
  description: 'Stations shown in the public station finder — coordinates power "near me" sorting.',
  queryKey: ["admin-content", "police_stations"],
  queryFn: async () => {
    const { data, error } = await supabase.from("police_stations").select("*").order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as Record<string, unknown>[];
  },
  schema,
  fields: [
    { name: "name", label: "Station name", type: "text" },
    { name: "county", label: "County / district", type: "text" },
    { name: "address", label: "Address", type: "text" },
    { name: "phone", label: "Phone", type: "text" },
    { name: "email", label: "Email", type: "text" },
    { name: "latitude", label: "Latitude", type: "number", placeholder: "e.g. 0.3476" },
    { name: "longitude", label: "Longitude", type: "number", placeholder: "e.g. 32.5825" },
  ],
  columns: [
    { key: "name", label: "Name" },
    { key: "county", label: "County" },
    { key: "phone", label: "Phone" },
  ],
  defaultValues: {
    name: "",
    county: "",
    address: "",
    phone: "",
    email: "",
    latitude: "",
    longitude: "",
  },
  rowTitle: (row) => String(row.name ?? "Untitled"),
};
