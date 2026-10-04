import { useSession } from "@/lib/session";
import { LoadingRows, PageHeading, Screen } from "@/components/ui";
import { DiscoverHome } from "@/features/home/DiscoverHome";
import { ClientHome } from "@/features/home/ClientHome";
import { PracticeHome } from "@/features/workspaces/PracticeHome";
import { PrecinctHome } from "@/features/workspaces/PrecinctHome";
import { BenchHome } from "@/features/workspaces/BenchHome";
import { AdminHome } from "@/features/admin/AdminHome";
import { ApplicationView, useApplying } from "@/features/onboarding/Application";

/** Role-aware home — the mobile equivalent of the web's ROLE_HOME redirect after sign-in. */
export default function HomeTab() {
  const { isSignedIn, loading, primaryRole } = useSession();
  const onboarding = useApplying();

  if (loading || (isSignedIn && primaryRole === "user" && onboarding.loading)) {
    return (
      <Screen edges={["top", "left", "right"]}>
        <LoadingRows rows={5} />
      </Screen>
    );
  }
  if (!isSignedIn) return <DiscoverHome />;
  // Joined as an advocate, police officer or judicial officer: finish the application first.
  if (onboarding.applying)
    return (
      <Screen edges={["top", "left", "right"]}>
        <PageHeading
          eyebrow="Welcome to LegalFinder"
          title="Finish your application"
          description="Send your details and documents. An administrator checks them before your account is switched on."
        />
        <ApplicationView />
      </Screen>
    );

  switch (primaryRole) {
    case "admin":
      return <AdminHome />;
    case "judiciary":
      return <BenchHome />;
    case "police":
      return <PrecinctHome />;
    case "lawyer":
      return <PracticeHome />;
    default:
      return <ClientHome />;
  }
}
