import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudTable } from "@/components/app/admin/content/content-crud-table";
import { newsConfig } from "@/components/app/admin/content/configs/news";

export const Route = createFileRoute("/_authenticated/admin/content/news")({
  component: () => <ContentCrudTable config={newsConfig} />,
});
