import { useSession } from "@/lib/session";
import { LoadingRows, Screen } from "@/components/ui";
import { DiscoverHome } from "@/features/home/DiscoverHome";
import { ClientHome } from "@/features/home/ClientHome";
import { PracticeHome } from "@/features/workspaces/PracticeHome";
import { PrecinctHome } from "@/features/workspaces/PrecinctHome";
import { BenchHome } from "@/features/workspaces/BenchHome";
import { AdminHome } from "@/features/admin/AdminHome";

/** Role-aware home — the mobile equivalent of the web's ROLE_HOME redirect after sign-in. */
export default function HomeTab() {
  const { isSignedIn, loading, primaryRole } = useSession();

  if (loading) {
    return (
      <Screen edges={["top", "left", "right"]}>
        <LoadingRows rows={5} />
      </Screen>
    );
  }
  if (!isSignedIn) return <DiscoverHome />;

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
