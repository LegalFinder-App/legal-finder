import type { ReactNode } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Lock } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useSession, type AppRole } from "@/lib/session";
import { Button, EmptyState, LoadingRows, Screen } from "@/components/ui";

/**
 * Guests can browse public content; anything personal (messages, cases, bookings) shows this
 * prompt instead of bouncing them out of the tab. `roles` restricts to professional workspaces.
 */
export function RequireAuth({
  children,
  roles,
  message = "Sign in to see your conversations, matters and documents.",
}: {
  children: ReactNode;
  roles?: AppRole[];
  message?: string;
}) {
  const { colors } = useTheme();
  const { isSignedIn, loading, roles: userRoles } = useSession();

  if (loading) {
    return (
      <Screen>
        <LoadingRows rows={4} />
      </Screen>
    );
  }

  if (!isSignedIn) {
    return (
      <Screen>
        <View style={{ marginTop: 40 }}>
          <EmptyState
            icon={<Lock size={22} color={colors.brass} />}
            title="Sign in to continue"
            description={message}
            action={
              <View style={{ gap: 10, alignSelf: "stretch" }}>
                <Button title="Sign in" onPress={() => router.push("/(auth)/sign-in")} />
                <Button
                  title="Create an account"
                  variant="outline"
                  onPress={() => router.push("/(auth)/sign-up")}
                />
              </View>
            }
          />
        </View>
      </Screen>
    );
  }

  if (roles && !roles.some((r) => userRoles.includes(r))) {
    return (
      <Screen>
        <View style={{ marginTop: 40 }}>
          <EmptyState
            icon={<Lock size={22} color={colors.brass} />}
            title="Not available for your account"
            description="This workspace is for verified professional accounts. If you applied for one, an administrator will review it."
          />
        </View>
      </Screen>
    );
  }

  return <>{children}</>;
}
