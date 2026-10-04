import { createFileRoute } from "@tanstack/react-router";
import { ClientWorkspace } from "@/components/app/workspace/client-workspace";
import { ApplicationPage } from "@/components/app/onboarding/application-view";
import { useApplying } from "@/components/app/onboarding/use-applying";
import { LoadingRows } from "@/components/common/bits";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

// Someone who joined as an advocate, police officer or judicial officer finishes the application
// before anything else; the dashboard is where every client lands after signing in.
function Dashboard() {
  const { loading, applying } = useApplying();
  if (loading)
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <LoadingRows rows={4} />
      </div>
    );
  return applying ? <ApplicationPage /> : <ClientWorkspace />;
}
