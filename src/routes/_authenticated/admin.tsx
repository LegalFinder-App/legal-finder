import { createFileRoute } from "@tanstack/react-router";
import { AdminAuditWorkspace } from "@/components/app/admin-audit-workspace";

export const Route = createFileRoute("/_authenticated/admin")({
  component: Page,
});

function Page() {
  return <AdminAuditWorkspace />;
}
