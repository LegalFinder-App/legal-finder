import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudTable } from "@/components/app/admin/content/content-crud-table";
import { quotesConfig } from "@/components/app/admin/content/configs/quotes";

export const Route = createFileRoute("/_authenticated/admin/content/quotes")({
  component: () => <ContentCrudTable config={quotesConfig} />,
});
