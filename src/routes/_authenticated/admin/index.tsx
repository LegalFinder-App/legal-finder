import { createFileRoute } from "@tanstack/react-router";
import { AdminOverview } from "@/components/app/admin/admin-overview";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "LegalFinder | Admin" }] }),
  component: AdminOverview,
});
