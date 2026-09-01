import { createFileRoute } from "@tanstack/react-router";
import { ContentCrudTable } from "@/components/app/admin/content/content-crud-table";
import { securityTipsConfig } from "@/components/app/admin/content/configs/security-tips";

export const Route = createFileRoute("/_authenticated/admin/content/security-tips")({
  component: () => <ContentCrudTable config={securityTipsConfig} />,
});
