import { createFileRoute } from "@tanstack/react-router";
import { PayoutsPanel } from "@/components/app/admin/payouts-panel";

export const Route = createFileRoute("/_authenticated/admin/payouts")({
  head: () => ({ meta: [{ title: "LegalFinder | Admin · Payouts" }] }),
  component: PayoutsPanel,
});
