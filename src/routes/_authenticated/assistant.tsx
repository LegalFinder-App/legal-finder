import { createFileRoute } from "@tanstack/react-router";
import { AssistantWorkspace } from "@/components/app/assistant-workspace";

export const Route = createFileRoute("/_authenticated/assistant")({
  component: Page,
});

function Page() {
  return <AssistantWorkspace />;
}
