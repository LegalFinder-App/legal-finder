import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useRef } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ClerkProvider, useAuth, useClerk } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import NetInfo from "@react-native-community/netinfo";
import { AppState, Platform } from "react-native";
import { Toaster } from "sonner-native";
import { useFonts, Fraunces_600SemiBold, Fraunces_700Bold } from "@expo-google-fonts/fraunces";
import {
  PublicSans_400Regular,
  PublicSans_500Medium,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
} from "@expo-google-fonts/public-sans";
import { IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { env } from "@/lib/env";
import { persister, queryClient, shouldPersistQuery } from "@/lib/query-client";
import { registerTokenGetter } from "@/lib/auth-token";
import { api } from "@/lib/api";
import { usePushRegistration } from "@/lib/push";
import { useRealtimeSync } from "@/lib/realtime";
import { BiometricGate } from "@/components/BiometricGate";

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
      </BiometricGate>
      <Toaster
        position="top-center"
        theme={scheme}
        toastOptions={{
          titleStyle: { fontFamily: "PublicSans_600SemiBold" },
          descriptionStyle: { fontFamily: "PublicSans_400Regular" },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ClerkProvider publishableKey={env.clerkPublishableKey} tokenCache={tokenCache}>
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
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
