import { createFileRoute } from "@tanstack/react-router";
import { ApplicationsPanel } from "@/components/app/admin/applications-panel";

export const Route = createFileRoute("/_authenticated/admin/applications")({
  head: () => ({ meta: [{ title: "LegalFinder | Admin · Applications" }] }),
  component: ApplicationsPanel,
});
