import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/app/workspace-page";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Page,
});

function Page() {
  return <WorkspacePage surface="dashboard" title="Overview" />;
}
