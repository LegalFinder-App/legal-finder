import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/app/workspace-page";

export const Route = createFileRoute("/_authenticated/precinct")({
  component: Page,
});

function Page() {
  return <WorkspacePage surface="precinct" title="Precinct" />;
}
