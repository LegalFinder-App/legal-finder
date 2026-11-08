import { createFileRoute } from "@tanstack/react-router";
import { AuditTrail } from "@/components/app/admin/audit-trail";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  head: () => ({ meta: [{ title: "LegalFinder | Admin · Audit trail" }] }),
  component: AuditTrail,
});
