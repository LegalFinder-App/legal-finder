import { createFileRoute } from "@tanstack/react-router";
import { UsersPanel } from "@/components/app/admin/users-panel";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersPanel,
});
