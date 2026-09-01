import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudTable } from "@/components/app/admin/content/content-crud-table";
import { libraryConfig } from "@/components/app/admin/content/configs/library";

export const Route = createFileRoute("/_authenticated/admin/content/library")({
  component: () => <ContentCrudTable config={libraryConfig} />,
});
