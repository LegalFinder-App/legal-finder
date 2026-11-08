import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudTable } from "@/components/app/admin/content/content-crud-table";
import { contentType } from "@/components/app/admin/content/registry";

const type = contentType("news");

export const Route = createFileRoute("/_authenticated/admin/content/news")({
  component: () => <ContentCrudTable config={type.config} type={type} />,
});
