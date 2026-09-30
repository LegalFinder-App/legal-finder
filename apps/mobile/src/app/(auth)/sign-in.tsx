import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { Link, router } from "expo-router";
import { useSignIn } from "@clerk/expo";
import { Button, Input, Text } from "@/components/ui";
import { AuthScaffold } from "@/components/auth/AuthScaffold";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { useTheme } from "@/theme/ThemeProvider";
import { errorMessage, toast } from "@/lib/toast";

type CodeStrategy = "totp" | "phone_code" | "email_code" | "backup_code";

// Same copy and strategy handling as the web's src/routes/auth.tsx code step.
const COPY: Record<CodeStrategy, { title: string; subtitle: string }> = {
  totp: {
    title: "Two-step verification",
    subtitle: "Enter the 6-digit code from your authenticator app.",
  },
  phone_code: { title: "Two-step verification", subtitle: "Enter the code we just texted you." },
  email_code: {
    title: "Verify this device",
    subtitle: "Enter the code we just emailed you to confirm it's really you.",
  },
  backup_code: {
    title: "Use a backup code",
    subtitle: "Enter one of the backup codes you saved when you set up two-step verification.",
  },
};

function finishSignIn() {
  // A pending MFA-setup session is routed by SessionTaskRouter; an active one goes home.
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
  const [strategy, setStrategy] = useState<CodeStrategy>("totp");
  const secondFactorStarted = useRef(false);

  const factors = (signIn.supportedSecondFactors ?? []).map((f) => f.strategy) as string[];

  const startCodeStep = async (preference: CodeStrategy[]) => {
    const chosen = preference.find((s) => factors.includes(s)) ?? preference[0];
    if (chosen === "phone_code") {
      const { error } = await signIn.mfa.sendPhoneCode();
      if (error) throw error;
    } else if (chosen === "email_code") {
      const { error } = await signIn.mfa.sendEmailCode();
      if (error) throw error;
    }
    setStrategy(chosen);
    setCode("");
  };

  const handleOutcome = async () => {
    if (signIn.status === "complete") {
      const { error } = await signIn.finalize();
      if (error) throw error;
      toast.success("Signed in");
      finishSignIn();
    } else if (signIn.status === "needs_second_factor") {
      await startCodeStep(["totp", "phone_code", "backup_code"]);
    } else if (signIn.status === "needs_client_trust") {
      await startCodeStep(["phone_code", "email_code"]);
    } else {
      throw new Error("Additional verification is required for this account.");
    }
  };

  // Social sign-in for an MFA-enrolled account returns still owing its second factor.
  useEffect(() => {
    if (signIn.status !== "needs_second_factor" || secondFactorStarted.current) return;
    secondFactorStarted.current = true;
    startCodeStep(["totp", "phone_code", "backup_code"]).catch((e) => toast.error(errorMessage(e)));
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

  const submitCode = async () => {
    const value = code?.trim();
    if (!value) return;
    setBusy(true);
    try {
      const { error } =
        strategy === "totp"
          ? await signIn.mfa.verifyTOTP({ code: value })
          : strategy === "backup_code"
            ? await signIn.mfa.verifyBackupCode({ code: value })
            : strategy === "phone_code"
              ? await signIn.mfa.verifyPhoneCode({ code: value })
              : await signIn.mfa.verifyEmailCode({ code: value });
      if (error) throw error;
      if (signIn.status !== "complete")
        throw new Error("That code didn't work — check it and try again.");
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
    const alternatives = (["totp", "phone_code", "backup_code"] as CodeStrategy[]).filter(
      (s) => s !== strategy && factors.includes(s),
    );
    return (
      <AuthScaffold title={COPY[strategy].title} subtitle={COPY[strategy].subtitle}>
        <Input
          label="Verification code"
          value={code}
          onChangeText={setCode}
          autoFocus
          keyboardType={strategy === "backup_code" ? "default" : "number-pad"}
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoCapitalize="none"
          maxLength={strategy === "backup_code" ? 16 : 6}
          placeholder={strategy === "backup_code" ? "Backup code" : "123456"}
          onSubmitEditing={() => void submitCode()}
        />
        <Button
          title="Verify and continue"
          onPress={() => void submitCode()}
          loading={busy}
          fullWidth
          size="lg"
        />
        {alternatives.map((s) => (
          <Pressable
            key={s}
            accessibilityRole="button"
            disabled={busy}
            onPress={() => startCodeStep([s]).catch((e) => toast.error(errorMessage(e)))}
          >
            <Text variant="small" tone="brass" align="center">
              {s === "totp"
                ? "Use your authenticator app instead"
                : s === "phone_code"
                  ? "Text me a code instead"
                  : "Use a backup code instead"}
            </Text>
          </Pressable>
        ))}
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
      <SocialButtons
        onDone={finishSignIn}
        onSecondFactor={() =>
          startCodeStep(["totp", "phone_code", "backup_code"]).catch((e) =>
            toast.error(errorMessage(e)),
          )
        }
      />
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
