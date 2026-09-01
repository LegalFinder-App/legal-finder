import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudTable } from "@/components/app/admin/content/content-crud-table";
import { judgementsConfig } from "@/components/app/admin/content/configs/judgements";

export const Route = createFileRoute("/_authenticated/admin/content/judgements")({
  component: () => <ContentCrudTable config={judgementsConfig} />,
});
