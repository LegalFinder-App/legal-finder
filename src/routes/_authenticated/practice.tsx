import { createFileRoute } from "@tanstack/react-router";
import { PracticeWorkspace } from "@/components/app/workspace/practice-workspace";
import { requireRoles } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/practice")({
  beforeLoad: requireRoles(["lawyer", "admin"]),
  component: PracticeWorkspace,
});
