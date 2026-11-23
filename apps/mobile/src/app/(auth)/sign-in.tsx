import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Link, router } from "expo-router";
import { useSignIn } from "@/lib/auth";
import { Button, Input, Text } from "@/components/ui";
import { AuthScaffold } from "@/components/auth/AuthScaffold";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { useTheme } from "@/theme/ThemeProvider";
import { isExpoGo } from "@/lib/runtime";
import { errorMessage, toast } from "@/lib/toast";

function finishSignIn() {
  if (router.canDismiss()) router.dismissAll();
  router.replace("/(tabs)");
}

export default function SignInScreen() {
  const { colors } = useTheme();
  const { signIn } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const emailCodeStarted = useRef(false);

  const startEmailCode = async () => {
    const { error } = await signIn.mfa.sendEmailCode();
    if (error) throw error;
    setCode("");
  };

  const handleOutcome = async () => {
    if (signIn.status === "complete") {
      const { error } = await signIn.finalize();
      if (error) throw error;
      toast.success("Signed in");
      finishSignIn();
    } else if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
      await startEmailCode();
    } else {
      throw new Error("Additional verification is required for this account.");
    }
  };

  useEffect(() => {
    if (
      (signIn.status !== "needs_second_factor" && signIn.status !== "needs_client_trust") ||
      emailCodeStarted.current
    ) {
      return;
    }
    emailCodeStarted.current = true;
    startEmailCode().catch((e) => toast.error(errorMessage(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signIn.status]);

  const submitPassword = async () => {
    if (!email.trim() || !password) return;
    setBusy(true);
    try {
      const { error } = await signIn.password({ identifier: email.trim(), password });
      if (error) throw error;
      await handleOutcome();
    } catch (error) {
      toast.error(errorMessage(error, "Sign-in failed"));
    } finally {
      setBusy(false);
    }
  };

  const submitPasskey = async () => {
    setBusy(true);
    try {
      const withPasskey = signIn as typeof signIn & {
        passkey?: (opts: { flow: "discoverable" }) => Promise<{ error?: Error | null }>;
      };
      if (typeof withPasskey.passkey !== "function") {
        throw new Error(
          "Passkeys need a native LegalFinder build and Clerk Dashboard setup — not Expo Go.",
        );
      }
      const { error } = await withPasskey.passkey({ flow: "discoverable" });
      if (error) throw error;
      await handleOutcome();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/not allowed|cancel|cancelled|canceled/i.test(message)) {
        toast.error(errorMessage(error, "Passkey sign-in failed"));
      }
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    const value = code?.trim();
    if (!value) return;
    setBusy(true);
    try {
      const { error } = await signIn.mfa.verifyEmailCode({ code: value });
      if (error) throw error;
      if (signIn.status !== "complete") {
        throw new Error("That code didn't work — check it and try again.");
      }
      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) throw finalizeError;
      toast.success("Signed in");
      finishSignIn();
    } catch (error) {
      toast.error(errorMessage(error, "Verification failed"));
    } finally {
      setBusy(false);
    }
  };

  if (code !== null) {
    return (
      <AuthScaffold
        title="Verify this device"
        subtitle="Enter the code we just emailed you to confirm it's really you."
      >
        <Input
          label="Verification code"
          value={code}
          onChangeText={setCode}
          autoFocus
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoCapitalize="none"
          maxLength={6}
          placeholder="123456"
          onSubmitEditing={() => void submitCode()}
        />
        <Button
          title="Verify and continue"
          onPress={() => void submitCode()}
          loading={busy}
          fullWidth
          size="lg"
        />
        <Pressable accessibilityRole="button" onPress={() => setCode(null)}>
          <Text variant="small" tone="muted" align="center">
            Back
          </Text>
        </Pressable>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold title="Welcome back" subtitle="Sign in to reach your workspace.">
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        placeholder="you@example.com"
        returnKeyType="next"
      />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureToggle
        autoComplete="current-password"
        textContentType="password"
        placeholder="Your password"
        returnKeyType="go"
        onSubmitEditing={() => void submitPassword()}
      />
      <Link href="/(auth)/forgot-password" asChild>
        <Pressable accessibilityRole="link" style={{ alignSelf: "flex-end" }}>
          <Text variant="small" tone="brass">
            Forgot password?
          </Text>
        </Pressable>
      </Link>
      <Button
        title="Sign in"
        onPress={() => void submitPassword()}
        loading={busy}
        disabled={!email.trim() || !password}
        size="lg"
        fullWidth
      />
      {!isExpoGo ? (
        <Button
          title="Sign in with a passkey"
          variant="outline"
          onPress={() => void submitPasskey()}
          loading={busy}
          size="lg"
          fullWidth
        />
      ) : null}
      <SocialButtons onDone={finishSignIn} onEmailCode={() => void startEmailCode()} />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 }}>
        <Text variant="small" tone="muted">
          New to LegalFinder?
        </Text>
        <Link href="/(auth)/sign-up" replace asChild>
          <Pressable accessibilityRole="link">
            <Text variant="small" style={{ color: colors.brass }}>
              Create an account
            </Text>
          </Pressable>
        </Link>
      </View>
    </AuthScaffold>
  );
}
