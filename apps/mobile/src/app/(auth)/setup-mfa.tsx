import { useEffect, useRef, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useClerk } from "@/lib/auth";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { Copy, ExternalLink, ShieldCheck } from "lucide-react-native";
import { Button, Card, Input, Text } from "@/components/ui";
import { AuthScaffold } from "@/components/auth/AuthScaffold";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/tokens";
import { shareText } from "@/lib/share";
import { errorMessage, toast } from "@/lib/toast";

type Step = "intro" | "enroll" | "backup";

/**
 * Clerk "setup-mfa" session task. The production instance requires MFA, so a new session stays
 * pending (treated as signed out) until an authenticator is enrolled here. Mirrors the web's
 * /session-tasks/setup-mfa, which uses Clerk's prebuilt TaskSetupMFA component.
 */
export default function SetupMfaScreen() {
  const { colors } = useTheme();
  const clerk = useClerk();
  const [step, setStep] = useState<Step>("intro");
  const [totp, setTotp] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  // Verifying the code here is what makes the session active — Clerk reports that before the
  // backup codes have even been fetched, so it must not count as "already active elsewhere".
  const verifiedHere = useRef(false);

  // If the session is already active (e.g. MFA finished on another device), there's nothing to do.
  useEffect(() => {
    const leaveIfActive = () => {
      if (clerk.session?.status === "active" && step !== "backup" && !verifiedHere.current)
        router.replace("/(tabs)");
    };
    leaveIfActive();
    return clerk.addListener(leaveIfActive);
  }, [clerk, step]);

  const begin = async () => {
    if (!clerk.user) return;
    setBusy(true);
    try {
      const resource = await clerk.user.createTOTP();
      if (!resource.secret || !resource.uri)
        throw new Error("Couldn't create an authenticator key.");
      setTotp({ secret: resource.secret, uri: resource.uri });
      setStep("enroll");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't start setup"));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!clerk.user) return;
    setBusy(true);
    verifiedHere.current = true;
    try {
      await clerk.user.verifyTOTP({ code: code.trim() });
      const backup = await clerk.user.createBackupCode().catch(() => null);
      setBackupCodes(backup?.codes ?? []);
      setStep("backup");
      toast.success("Two-step verification is on");
    } catch (error) {
      verifiedHere.current = false;
      toast.error(errorMessage(error, "That code didn't work — try the latest one"));
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    try {
      // Re-reading the session lets Clerk see the task is resolved and flip it to active.
      await clerk.session?.reload();
      if (clerk.session?.id) await clerk.setActive({ session: clerk.session.id });
      router.replace("/(tabs)");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't finish sign-in"));
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await clerk.signOut();
    router.replace("/(tabs)");
  };

  if (step === "intro") {
    return (
      <AuthScaffold
        dismissible={false}
        title="Secure your account"
        subtitle="LegalFinder protects case files and messages with two-step verification. Set it up once, then you'll go straight to your workspace."
      >
        <Card>
          <View style={styles.row}>
            <ShieldCheck size={22} color={colors.brass} />
            <Text variant="small" style={{ flex: 1 }}>
              You’ll need an authenticator app such as Google Authenticator, Microsoft Authenticator
              or 1Password.
            </Text>
          </View>
        </Card>
        <Button
          title="Set up authenticator"
          onPress={() => void begin()}
          loading={busy}
          size="lg"
          fullWidth
        />
        <Pressable accessibilityRole="button" onPress={() => void signOut()}>
          <Text variant="small" tone="muted" align="center">
            Use a different account
          </Text>
        </Pressable>
      </AuthScaffold>
    );
  }

  if (step === "enroll" && totp) {
    return (
      <AuthScaffold dismissible={false} title="Add LegalFinder to your authenticator">
        {/* A computer has no authenticator app to hand the key to — there the QR code is the way in. */}
        {Platform.OS === "web" ? (
          <Text variant="small" tone="muted" align="center">
            Scan this code with the authenticator app on your phone:
          </Text>
        ) : (
          <>
            <Button
              title="Open authenticator app"
              variant="primary"
              icon={<ExternalLink size={16} color={colors.primaryForeground} />}
              onPress={() =>
                Linking.openURL(totp.uri).catch(() =>
                  toast.error("No authenticator app found on this phone."),
                )
              }
              fullWidth
            />
            <Text variant="small" tone="muted" align="center">
              Or scan this code from another device:
            </Text>
          </>
        )}
        <View style={[styles.qr, { backgroundColor: "#ffffff" }]}>
          <QRCode value={totp.uri} size={180} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copy setup key"
          onPress={() => {
            void Clipboard.setStringAsync(totp.secret);
            toast.success("Setup key copied");
          }}
          style={[styles.secret, { borderColor: colors.border }]}
        >
          <Text style={{ fontFamily: fonts.mono, fontSize: 13, flex: 1 }} selectable>
            {totp.secret.match(/.{1,4}/g)?.join(" ")}
          </Text>
          <Copy size={16} color={colors.mutedForeground} />
        </Pressable>
        <Input
          label="Enter the 6-digit code it shows"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          maxLength={6}
          placeholder="123456"
          onSubmitEditing={() => void verify()}
        />
        <Button
          title="Verify and turn on"
          onPress={() => void verify()}
          loading={busy}
          disabled={code.trim().length !== 6}
          size="lg"
          fullWidth
        />
      </AuthScaffold>
    );
  }

  return (
    <AuthScaffold
      dismissible={false}
      title="Save your backup codes"
      subtitle="If you lose your phone, each code signs you in once. Keep them somewhere safe — they won't be shown again."
    >
      {backupCodes.length > 0 ? (
        <>
          <Card>
            <View style={styles.codes}>
              {backupCodes.map((c) => (
                <Text
                  key={c}
                  style={{ fontFamily: fonts.mono, fontSize: 14, width: "45%" }}
                  selectable
                >
                  {c}
                </Text>
              ))}
            </View>
          </Card>
          <Button
            title="Share or save codes"
            variant="outline"
            onPress={() =>
              void shareText(
                `LegalFinder backup codes:\n\n${backupCodes.join("\n")}`,
                "Your backup codes",
              )
            }
            fullWidth
          />
        </>
      ) : (
        <Text tone="muted">You can generate backup codes later from Settings → Security.</Text>
      )}
      <Button
        title="Continue to LegalFinder"
        onPress={() => void finish()}
        loading={busy}
        size="lg"
        fullWidth
      />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  qr: { alignSelf: "center", padding: 14, borderRadius: 12 },
  secret: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  codes: { flexDirection: "row", flexWrap: "wrap", rowGap: 10, justifyContent: "space-between" },
});
