import { createFileRoute } from "@tanstack/react-router";
import { VerificationsPanel } from "@/components/app/admin/verifications-panel";

export const Route = createFileRoute("/_authenticated/admin/verifications")({
  head: () => ({ meta: [{ title: "LegalFinder | Admin · Verifications" }] }),
  component: VerificationsPanel,
});
