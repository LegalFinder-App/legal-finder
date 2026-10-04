import { createFileRoute } from "@tanstack/react-router";
import { ReportsPanel } from "@/components/app/admin/reports-panel";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: ReportsPanel,
});
