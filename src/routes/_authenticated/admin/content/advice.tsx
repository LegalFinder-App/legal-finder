import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudTable } from "@/components/app/admin/content/content-crud-table";
import { adviceConfig } from "@/components/app/admin/content/configs/advice";

export const Route = createFileRoute("/_authenticated/admin/content/advice")({
  component: () => <ContentCrudTable config={adviceConfig} />,
});
