import { createFileRoute } from "@tanstack/react-router";
import { AdminAuditWorkspace } from "@/components/app/admin-audit-workspace";
import { requireRoles } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: requireRoles(["admin"]),
  component: Page,
});

function Page() {
  return <AdminAuditWorkspace />;
}
