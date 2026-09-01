import { createFileRoute } from "@tanstack/react-router";
import { PrecinctWorkspace } from "@/components/app/workspace/precinct-workspace";
import { requireRoles } from "@/lib/rbac";

export const Route = createFileRoute("/_authenticated/precinct")({
  beforeLoad: requireRoles(["police", "admin"]),
  component: PrecinctWorkspace,
});
