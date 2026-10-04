import { Stack, useLocalSearchParams } from "expo-router";
import { PageHeading, Screen } from "@/components/ui";
import { RequireAuth } from "@/components/RequireAuth";
import { ApplicationView } from "@/features/onboarding/Application";
import { isApplicationRole } from "@/lib/onboarding";

/** Apply for an advocate, police or judiciary account (?role= picks one). */
export default function ApplyScreen() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  return (
    <RequireAuth message="Sign in to apply for an advocate, police or judiciary account.">
      <Stack.Screen options={{ title: "Professional account" }} />
      <Screen>
        <PageHeading
          eyebrow="Professional account"
          title="Apply for access"
          description="Send your details and documents. An administrator checks them before your account is switched on."
        />
        <ApplicationView initialRole={isApplicationRole(role) ? role : null} />
      </Screen>
    </RequireAuth>
  );
}
