import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/app/workspace-page";
import { requireRoles } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/bench")({
  beforeLoad: requireRoles(["judiciary", "admin"]),
  component: Page,
});

function Page() {
  return <WorkspacePage surface="bench" title="Bench" />;
}
