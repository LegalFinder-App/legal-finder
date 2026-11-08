import { createFileRoute } from "@tanstack/react-router";
import { ApplicationPage } from "@/components/app/onboarding/application-view";
import { isApplicationRole, type ApplicationRole } from "@/lib/onboarding";

export const Route = createFileRoute("/_authenticated/apply")({
  head: () => ({ meta: [{ title: "LegalFinder | Professional account" }] }),
  validateSearch: (search: Record<string, unknown>): { role?: ApplicationRole } =>
    isApplicationRole(search.role) ? { role: search.role } : {},
  component: ApplyPage,
});

function ApplyPage() {
  const { role } = Route.useSearch();
  return <ApplicationPage initialRole={role ?? null} />;
}
