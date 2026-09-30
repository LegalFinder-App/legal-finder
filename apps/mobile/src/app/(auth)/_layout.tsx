import { Stack } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";

export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="forgot-password" />
      {/* Required step once the session exists but MFA isn't set up — no way to back out of it. */}
      <Stack.Screen name="setup-mfa" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
