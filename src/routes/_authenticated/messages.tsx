import { createFileRoute } from "@tanstack/react-router";
import { MessagingWorkspace } from "@/components/app/messaging-workspace";

export const Route = createFileRoute("/_authenticated/messages")({
  component: Page,
});

function Page() {
  return <MessagingWorkspace />;
}
