import { createFileRoute } from "@tanstack/react-router";
import { BenchWorkspace } from "@/components/app/workspace/bench-workspace";
import { requireRoles } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/bench")({
  beforeLoad: requireRoles(["judiciary", "admin"]),
  component: BenchWorkspace,
});
