import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudTable } from "@/components/app/admin/content/content-crud-table";
import { contentType } from "@/components/app/admin/content/registry";

const type = contentType("advice");

export const Route = createFileRoute("/_authenticated/admin/content/advice")({
  component: () => <ContentCrudTable config={type.config} type={type} />,
});
