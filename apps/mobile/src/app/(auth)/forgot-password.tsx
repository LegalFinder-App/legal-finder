import { useState } from "react";
import { Pressable } from "react-native";
import { router } from "expo-router";
import { useSignIn } from "@clerk/expo";
import { Button, Input, Text } from "@/components/ui";
import { AuthScaffold } from "@/components/auth/AuthScaffold";
import { errorMessage, toast } from "@/lib/toast";

// Same Clerk flow as the web's src/routes/reset-password.tsx.
export default function ForgotPasswordScreen() {
  const { signIn } = useSignIn();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    setBusy(true);
    try {
      const { error } = await signIn.create({ identifier: email.trim() });
      if (error) throw error;
      const { error: codeError } = await signIn.resetPasswordEmailCode.sendCode();
      if (codeError) throw codeError;
      setStep("reset");
      toast.message("Check your email", { description: "We sent a reset code to your inbox." });
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't send the reset code"));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      const { error } = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (error) throw error;
      const { error: submitError } = await signIn.resetPasswordEmailCode.submitPassword({
        password,
      });
      if (submitError) throw submitError;
      if (signIn.status === "needs_second_factor") {
        toast.message("Password updated", {
          description: "Sign in again to finish with your verification code.",
        });
        router.replace("/(auth)/sign-in");
        return;
      }
      if (signIn.status !== "complete") throw new Error("Couldn't finish resetting your password.");
      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) throw finalizeError;
      toast.success("Password updated");
      if (router.canDismiss()) router.dismissAll();
      router.replace("/(tabs)");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't reset your password"));
    } finally {
      setBusy(false);
    }
  };

  if (step === "email") {
    return (
      <AuthScaffold
        title="Reset your password"
        subtitle="We'll email you a code to choose a new one."
      >
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholder="you@example.com"
          onSubmitEditing={() => void sendCode()}
        />
        <Button
          title="Send reset code"
          onPress={() => void sendCode()}
          loading={busy}
          disabled={!email.includes("@")}
          size="lg"
          fullWidth
        />
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text variant="small" tone="muted" align="center">
            Back to sign in
          </Text>
        </Pressable>
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      title="Choose a new password"
      subtitle={`Enter the code we sent to ${email.trim()}.`}
    >
      <Input
        label="Reset code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="123456"
      />
      <Input
        label="New password"
        value={password}
        onChangeText={setPassword}
        secureToggle
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="At least 8 characters"
      />
      <Button
        title="Update password"
        onPress={() => void reset()}
        loading={busy}
        disabled={code.trim().length < 6 || password.length < 8}
        size="lg"
        fullWidth
      />
    </AuthScaffold>
  );
}
