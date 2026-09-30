import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeading, Screen } from "@/components/ui";
import { RequireAuth } from "@/components/RequireAuth";
import { DocumentList } from "@/features/documents/DocumentList";
import { useSession } from "@/lib/session";
import { documentsQuery } from "@/lib/queries";

function Documents() {
  const { user } = useSession();
  const docs = useQuery(documentsQuery(user?.id));
  return (
    <Screen refreshing={docs.isRefetching} onRefresh={() => void docs.refetch()}>
      <PageHeading
        eyebrow="Secure vault"
        title="Documents"
        description="Pleadings, evidence and correspondence — private to you and the parties on each matter."
      />
      <DocumentList userId={user?.id} documents={docs.data ?? []} loading={docs.isLoading} />
    </Screen>
  );
}

export default function DocumentsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Documents" }} />
      <RequireAuth>
        <Documents />
      </RequireAuth>
    </>
  );
}
