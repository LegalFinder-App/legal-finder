import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/app/workspace-page";
import { requireRoles } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/practice")({
  beforeLoad: requireRoles(["lawyer", "admin"]),
  component: Page,
});

function Page() {
  return <WorkspacePage surface="practice" title="Practice" />;
}
