import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useRef } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AlertHost } from "@/lib/alert";
import { AuthProvider, useAuth, useClerk } from "@/lib/auth";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import NetInfo from "@react-native-community/netinfo";
import { AppState, Platform } from "react-native";
import { Toaster } from "sonner-native";
import { useFonts } from "expo-font";
// One file per weight, by path: importing from a font package's index would bundle every weight
// and italic it ships (dozens of unused font files in the app).
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces/600SemiBold";
import { Fraunces_700Bold } from "@expo-google-fonts/fraunces/700Bold";
import { PublicSans_400Regular } from "@expo-google-fonts/public-sans/400Regular";
import { PublicSans_500Medium } from "@expo-google-fonts/public-sans/500Medium";
import { PublicSans_600SemiBold } from "@expo-google-fonts/public-sans/600SemiBold";
import { PublicSans_700Bold } from "@expo-google-fonts/public-sans/700Bold";
import { IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono/500Medium";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { persister, queryClient, shouldPersistQuery } from "@/lib/query-client";
import { registerTokenGetter } from "@/lib/auth-token";
import { useDesktopDeepLinks } from "@/lib/desktop-links";
import { useWideLayout } from "@/lib/layout";
import "@/lib/desktop-styles";
import { api } from "@/lib/api";
import { usePushRegistration } from "@/lib/push";
import { useRealtimeSync } from "@/lib/realtime";
import { BiometricGate } from "@/components/BiometricGate";
import { DesktopShell } from "@/components/DesktopShell";

// Expo Router wraps the whole app in this; without it a render error closes a release build.
export { RootErrorBoundary as ErrorBoundary } from "@/components/RootErrorBoundary";

void SplashScreen.preventAutoHideAsync();

// TanStack Query only knows about browser focus/online events; wire it to the native equivalents
// so screens refetch when the app returns to the foreground or the connection comes back.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(Boolean(state.isConnected))),
);
AppState.addEventListener("change", (status) => {
  if (Platform.OS !== "web") focusManager.setFocused(status === "active");
});

/** Lets the Supabase client and API client read the Clerk session token outside React. */
function AuthBridge() {
  const { getToken, isSignedIn, userId } = useAuth();
  const provisioned = useRef<string | null>(null);

  useEffect(() => {
    registerTokenGetter(isSignedIn ? () => getToken() : null);
    return () => registerTokenGetter(null);
  }, [getToken, isSignedIn]);

  // First authenticated launch per user: make sure the server has created the profile row and
  // default role (the web app does this lazily in checkClerkSession). Roles are refetched after.
  useEffect(() => {
    if (!isSignedIn || !userId || provisioned.current === userId) return;
    provisioned.current = userId;
    api
      .session()
      .then(() => queryClient.invalidateQueries({ queryKey: ["roles", userId] }))
      .catch(() => {
        provisioned.current = null;
      });
  }, [isSignedIn, userId]);

  usePushRegistration();
  useRealtimeSync();
  useDesktopDeepLinks();
  return null;
}

/**
 * The production Clerk instance requires MFA: a fresh session stays "pending" on a setup-mfa task
 * and Clerk treats it as signed out until the user enrolls. Route to the enrollment screen
 * whenever that happens, from any entry point (password, social sign-in, app relaunch).
 */
function SessionTaskRouter() {
  const clerk = useClerk();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const check = () => {
      const session = clerk.session;
      const path = segments as string[];
      const onTaskScreen = path[0] === "(auth)" && path[1] === "setup-mfa";
      if (
        session?.status === "pending" &&
        session.currentTask?.key === "setup-mfa" &&
        !onTaskScreen
      ) {
        router.replace("/(auth)/setup-mfa");
      }
    };
    check();
    return clerk.addListener(check);
  }, [clerk, router, segments]);

  return null;
}

function RootNavigator() {
  const { colors, scheme } = useTheme();
  const wide = useWideLayout();
  const { isLoaded } = useAuth();
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
    IBMPlexMono_500Medium,
  });

  const ready = fontsLoaded && isLoaded;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <AuthBridge />
      <SessionTaskRouter />
      <BiometricGate>
        <DesktopShell>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.foreground,
              headerTitleStyle: { fontFamily: "Fraunces_600SemiBold", fontSize: 18 },
              headerShadowVisible: false,
              headerBackButtonDisplayMode: "minimal",
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false, presentation: "modal" }} />
          </Stack>
        </DesktopShell>
      </BiometricGate>
      <AlertHost />
      <Toaster
        position="top-center"
        theme={scheme}
        toastOptions={{
          titleStyle: { fontFamily: "PublicSans_600SemiBold" },
          descriptionStyle: { fontFamily: "PublicSans_400Regular" },
          // A phone toast spans the screen; on a wide desktop window that would be a banner.
          style: wide ? { width: 420, alignSelf: "center" } : undefined,
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <AuthProvider>
            <PersistQueryClientProvider
              client={queryClient}
              persistOptions={{
                persister,
                maxAge: 24 * 60 * 60_000,
                dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
              }}
            >
              <ThemeProvider>
                <RootNavigator />
              </ThemeProvider>
            </PersistQueryClientProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
