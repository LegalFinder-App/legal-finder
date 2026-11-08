import { createFileRoute } from "@tanstack/react-router";
import { CaseDetail } from "@/components/app/workspace/case-detail";

export const Route = createFileRoute("/_authenticated/cases/$caseId")({
  head: () => ({ meta: [{ title: "LegalFinder | Case" }] }),
  component: CaseDetailRoute,
});

function CaseDetailRoute() {
  const { caseId } = Route.useParams();
  return <CaseDetail caseId={caseId} />;
}
