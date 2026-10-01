import { Stack, router, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeading, Screen } from "@/components/ui";
import { RequireAuth } from "@/components/RequireAuth";
import { DocumentGenerator } from "@/features/documents/DocumentGenerator";
import { useSession } from "@/lib/session";

// A screen rather than a sheet: the form is long, and its date and select fields open sheets of
// their own.
function GenerateDocument({ caseId }: { caseId: string | undefined }) {
  const { user } = useSession();
  const qc = useQueryClient();

  return (
    <Screen>
      <PageHeading
        eyebrow="Documents"
        title="Generate a document"
        description={
          caseId
            ? "The PDF is saved with this matter’s documents. It is a first draft — have a licensed advocate review it before use."
            : "The PDF is saved to your documents. It is a first draft — have a licensed advocate review it before use."
        }
      />
      <DocumentGenerator
        caseId={caseId}
        onGenerated={() => {
          void qc.invalidateQueries({ queryKey: ["documents", user?.id] });
          if (router.canGoBack()) router.back();
          else router.replace(caseId ? `/cases/${caseId}` : "/documents");
        }}
      />
    </Screen>
  );
}

export default function GenerateDocumentScreen() {
  const { caseId } = useLocalSearchParams<{ caseId?: string }>();
  return (
    <>
      <Stack.Screen options={{ title: "Generate a document" }} />
      <RequireAuth>
        <GenerateDocument caseId={caseId || undefined} />
      </RequireAuth>
    </>
  );
}
