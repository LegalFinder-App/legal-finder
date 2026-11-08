import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudTable } from "@/components/app/admin/content/content-crud-table";
import { contentType } from "@/components/app/admin/content/registry";

const type = contentType("wanted");

export const Route = createFileRoute("/_authenticated/admin/content/wanted")({
  component: () => <ContentCrudTable config={type.config} type={type} />,
});
