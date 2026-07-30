import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/app/workspace-page";

export const Route = createFileRoute("/_authenticated/messages")({
  component: Page,
});

function Page() {
  return <WorkspacePage surface="messages" title="Messages" />;
}
