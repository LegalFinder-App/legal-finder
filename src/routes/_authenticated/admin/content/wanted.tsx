import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudTable } from "@/components/app/admin/content/content-crud-table";
import { wantedConfig } from "@/components/app/admin/content/configs/wanted";

export const Route = createFileRoute("/_authenticated/admin/content/wanted")({
  component: () => <ContentCrudTable config={wantedConfig} />,
});
