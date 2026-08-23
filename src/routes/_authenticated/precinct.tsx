import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/app/workspace-page";
import { requireRoles } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/precinct")({
  beforeLoad: requireRoles(["police", "admin"]),
  component: Page,
});

function Page() {
  return <WorkspacePage surface="precinct" title="Precinct" />;
}
