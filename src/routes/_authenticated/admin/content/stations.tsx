import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudTable } from "@/components/app/admin/content/content-crud-table";
import { contentType } from "@/components/app/admin/content/registry";

const type = contentType("stations");

export const Route = createFileRoute("/_authenticated/admin/content/stations")({
  component: () => <ContentCrudTable config={type.config} type={type} />,
});
