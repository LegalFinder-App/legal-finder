import { createFileRoute } from "@tanstack/react-router";
import { UsersPanel } from "@/components/app/admin/users-panel";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "LegalFinder | Admin · Users" }] }),
  component: UsersPanel,
});
