import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudTable } from "@/components/app/admin/content/content-crud-table";
import { stationsConfig } from "@/components/app/admin/content/configs/stations";

export const Route = createFileRoute("/_authenticated/admin/content/stations")({
  component: () => <ContentCrudTable config={stationsConfig} />,
});
