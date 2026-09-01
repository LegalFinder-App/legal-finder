import { createFileRoute } from "@tanstack/react-router";
import { ClientWorkspace } from "@/components/app/workspace/client-workspace";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: ClientWorkspace,
});
