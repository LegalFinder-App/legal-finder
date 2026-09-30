import { useState } from "react";
import { Pressable, View } from "react-native";
import { Link, router } from "expo-router";
import { useSignUp } from "@clerk/expo";
import { Check } from "lucide-react-native";
import { Button, Input, SelectField, Text } from "@/components/ui";
import { AuthScaffold } from "@/components/auth/AuthScaffold";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { useTheme } from "@/theme/ThemeProvider";
import { ROLE_LABELS, type AppRole } from "@/lib/session";
import { errorMessage, toast } from "@/lib/toast";

const SIGNUP_ROLES = (Object.keys(ROLE_LABELS) as AppRole[]).filter((r) => r !== "admin");

function done() {
  if (router.canDismiss()) router.dismissAll();
  router.replace("/(tabs)");
}

export default function SignUpScreen() {
  const { colors } = useTheme();
  const { signUp } = useSignUp();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("user");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  const welcome = () =>
    toast.success("Account created", {
      description:
        role === "user"
          ? "Welcome to LegalFinder."
          : "Your account is active. Privileged roles require administrator approval.",
    });

  const submit = async () => {
    if (!legalAccepted) {
      toast.error("Please agree to the terms and privacy policy to continue.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await signUp.password({
        emailAddress: email.trim(),
        password,
        legalAccepted,
        unsafeMetadata: { full_name: fullName.trim(), requested_role: role },
      });
      if (error) throw error;
      if (signUp.status === "complete") {
        const { error: finalizeError } = await signUp.finalize();
        if (finalizeError) throw finalizeError;
        welcome();
        done();
      } else {
        const { error: codeError } = await signUp.verifications.sendEmailCode();
        if (codeError) throw codeError;
        setCode("");
        toast.message("Check your email", {
          description: "Enter the verification code we just sent you.",
        });
      }
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't create your account"));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    const value = code?.trim();
    if (!value) return;
    setBusy(true);
    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code: value });
      if (error) throw error;
      if (signUp.status === "missing_requirements") {
        throw new Error(
          `Your email is verified, but sign-up needs: ${signUp.missingFields.join(", ")}. Contact support@legalfinder.co.`,
        );
      }
      if (signUp.status !== "complete")
        throw new Error("That code didn't work — check it and try again.");
      const { error: finalizeError } = await signUp.finalize();
      if (finalizeError) throw finalizeError;
      welcome();
      done();
    } catch (error) {
      toast.error(errorMessage(error, "Verification failed"));
    } finally {
      setBusy(false);
    }
  };

  if (code !== null) {
    return (
      <AuthScaffold
        title="Verify your email"
        subtitle={`Enter the code we sent to ${email.trim()}.`}
      >
        <Input
          label="Verification code"
          value={code}
          onChangeText={setCode}
          autoFocus
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          onSubmitEditing={() => void verify()}
        />
        <Button
          title="Verify and continue"
          onPress={() => void verify()}
          loading={busy}
          size="lg"
          fullWidth
        />
        <Pressable accessibilityRole="button" onPress={() => setCode(null)}>
          <Text variant="small" tone="muted" align="center">
            Back
          </Text>
        </Pressable>
      </AuthScaffold>
    );
  }

  const canSubmit =
    fullName.trim().length > 1 && email.includes("@") && password.length >= 8 && legalAccepted;

  return (
    <AuthScaffold
      title="Create your account"
      subtitle="Choose the role that matches how you'll use LegalFinder."
    >
      <Input
        label="Full name"
        value={fullName}
        onChangeText={setFullName}
        autoComplete="name"
        textContentType="name"
        placeholder="e.g. Amina Nakato"
      />
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        placeholder="you@example.com"
      />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureToggle
        autoComplete="new-password"
        textContentType="newPassword"
        placeholder="At least 8 characters"
        hint="Use 8+ characters. Avoid passwords you use elsewhere."
      />
      <SelectField
        label="I am joining as"
        value={role}
        onChange={setRole}
        options={SIGNUP_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
      />
      {role !== "user" ? (
        <Text variant="small" tone="muted">
          {ROLE_LABELS[role]} access is reviewed by an administrator before it’s granted. You can
          use the app as a client in the meantime.
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: legalAccepted }}
        onPress={() => setLegalAccepted((v) => !v)}
        style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 1.5,
            borderColor: legalAccepted ? colors.brass : colors.border,
            backgroundColor: legalAccepted ? colors.brass : "transparent",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 1,
          }}
        >
          {legalAccepted ? <Check size={14} color={colors.brassForeground} /> : null}
        </View>
        <Text variant="small" style={{ flex: 1 }}>
          I agree to LegalFinder’s{" "}
          <Link href="/legal/terms" style={{ color: colors.brass }}>
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" style={{ color: colors.brass }}>
            Privacy Policy
          </Link>
          .
        </Text>
      </Pressable>

      <Button
        title="Create account"
        onPress={() => void submit()}
        loading={busy}
        disabled={!canSubmit}
        size="lg"
        fullWidth
      />
      <SocialButtons onDone={done} onSecondFactor={() => router.replace("/(auth)/sign-in")} />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 }}>
        <Text variant="small" tone="muted">
          Already have an account?
        </Text>
        <Link href="/(auth)/sign-in" replace asChild>
          <Pressable accessibilityRole="link">
            <Text variant="small" style={{ color: colors.brass }}>
              Sign in
            </Text>
          </Pressable>
        </Link>
      </View>
    </AuthScaffold>
  );
}
