import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { showAlert } from "@/lib/alert";
import { Stack, router } from "expo-router";
import { useClerk, useUser } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { Camera, KeyRound, ShieldCheck } from "lucide-react-native";
import { useTheme, type ThemePreference } from "@/theme/ThemeProvider";
import {
  Avatar,
  Button,
  Card,
  Input,
  PageHeading,
  Screen,
  SectionTitle,
  Segmented,
  Sheet,
  SwitchField,
  Text,
} from "@/components/ui";
import { RequireAuth } from "@/components/RequireAuth";
import { appLockAvailable, isAppLockEnabled, setAppLockEnabled } from "@/components/BiometricGate";
import { PayoutDetailsCard } from "@/features/payouts/PayoutDetailsCard";
import { useSession } from "@/lib/session";
import { useAiConsent } from "@/lib/ai-consent";
import { pickImage, updateProfilePhoto } from "@/lib/images";
import {
  disablePushNotifications,
  enablePushNotifications,
  pushAvailable,
  pushStatus,
} from "@/lib/push";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { shareText } from "@/lib/share";
import { errorMessage, toast } from "@/lib/toast";

function Settings() {
  const { colors, preference, setPreference } = useTheme();
  const { user: clerkUser } = useUser();
  const clerk = useClerk();
  const { user, primaryRole } = useSession();
  const aiConsent = useAiConsent();
  const qc = useQueryClient();
  const [name, setName] = useState(user?.fullName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Shown while the upload runs, so the new photo appears the moment it's chosen.
  const [preview, setPreview] = useState<string | null>(null);
  const [appLock, setAppLock] = useState(false);
  const [push, setPush] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void isAppLockEnabled().then(setAppLock);
    void pushStatus().then((status) => setPush(status === "on"));
  }, []);

  if (!user || !clerkUser) return null;

  const changePhoto = async () => {
    let asset;
    try {
      asset = await pickImage({ square: true });
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't open your photos"));
      return;
    }
    if (!asset) return;
    setPreview(asset.uri);
    setUploading(true);
    try {
      await updateProfilePhoto(asset, user.id);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["profile", user.id] }),
        qc.invalidateQueries({ queryKey: ["lawyers"] }),
      ]);
      toast.success("Photo updated");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't update your photo"));
    } finally {
      setPreview(null);
      setUploading(false);
    }
  };

  const saveName = async () => {
    const full = name.trim();
    if (!full) return;
    setSavingName(true);
    try {
      const [first, ...rest] = full.split(/\s+/);
      await clerkUser.update({ firstName: first, lastName: rest.join(" ") || undefined });
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: full })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Name updated");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't update your name"));
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async () => {
    setPwBusy(true);
    try {
      await clerkUser.updatePassword({
        currentPassword: currentPw,
        newPassword: newPw,
        signOutOfOtherSessions: true,
      });
      toast.success("Password updated", { description: "Other devices have been signed out." });
      setPwOpen(false);
      setCurrentPw("");
      setNewPw("");
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't update your password"));
    } finally {
      setPwBusy(false);
    }
  };

  const newBackupCodes = async () => {
    try {
      const backup = await clerkUser.createBackupCode();
      await shareText(
        `LegalFinder backup codes (each works once):\n\n${backup.codes.join("\n")}`,
        "New backup codes",
      );
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't create backup codes"));
    }
  };

  const toggleLock = async (on: boolean) => {
    const ok = await setAppLockEnabled(on);
    if (!ok && on) toast.error("Set up Face ID, Touch ID or a fingerprint on this phone first.");
    setAppLock(await isAppLockEnabled());
  };

  const togglePush = async (on: boolean) => {
    try {
      if (on) {
        const result = await enablePushNotifications();
        if (result === "denied")
          toast.error("Notifications are blocked", {
            description: "Enable them for LegalFinder in your phone's Settings.",
          });
        if (result === "unavailable")
          toast.message("Push notifications aren't available on this device yet");
        setPush(result === "granted");
      } else {
        await disablePushNotifications();
        setPush(false);
        toast.message("You won't get push notifications on this device");
      }
    } catch (error) {
      // Registration can fail (offline, push service unreachable) — say so rather than leaving
      // the switch looking like it ignored the tap.
      console.warn("[push]", error);
      toast.error(on ? "Couldn't turn on notifications" : "Couldn't turn off notifications", {
        description: "Please try again in a moment.",
      });
    } finally {
      void queryClient.invalidateQueries({ queryKey: ["push-status"] });
    }
  };

  const deleteAccount = () =>
    showAlert(
      "Delete your account?",
      "This permanently deletes your sign-in account and profile, and you won't be able to sign back in. Case, payment and audit records that form part of a legal or financial file may be kept for as long as the law requires. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete permanently",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deleteAccount();
              await clerk.signOut().catch(() => undefined);
              queryClient.clear();
              toast.success("Your account has been deleted");
              router.replace("/(tabs)");
            } catch (error) {
              toast.error(errorMessage(error, "Couldn't delete your account"));
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );

  return (
    <Screen>
      <PageHeading eyebrow="Account" title="Settings" />

      <Card>
        <View style={{ alignItems: "center", gap: 10 }}>
          <Avatar name={user.fullName ?? user.email} uri={preview ?? user.imageUrl} size={84} />
          <Button
            title={uploading ? "Uploading…" : "Change photo"}
            size="sm"
            variant="outline"
            loading={uploading}
            icon={<Camera size={14} color={colors.foreground} />}
            onPress={() => void changePhoto()}
          />
        </View>
        <View style={{ gap: 12, marginTop: 16 }}>
          <Input label="Full name" value={name} onChangeText={setName} autoComplete="name" />
          <Input
            label="Email"
            value={user.email ?? ""}
            editable={false}
            hint="Contact support to change your sign-in email."
          />
          <Button
            title="Save name"
            size="sm"
            loading={savingName}
            disabled={!name.trim() || name.trim() === user.fullName}
            onPress={() => void saveName()}
            style={{ alignSelf: "flex-start" }}
          />
        </View>
      </Card>

      {primaryRole === "lawyer" ? (
        <>
          <SectionTitle title="Payout details" />
          <PayoutDetailsCard lawyerUserId={user.id} />
        </>
      ) : null}

      <SectionTitle title="Security" />
      <Card>
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <ShieldCheck
              size={20}
              color={clerkUser.twoFactorEnabled ? colors.success : colors.warning}
            />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">Two-step verification</Text>
              <Text variant="small" tone="muted">
                {clerkUser.twoFactorEnabled
                  ? "On — your account asks for a code on new devices."
                  : "Off"}
              </Text>
            </View>
          </View>
          {clerkUser.twoFactorEnabled ? (
            <Button
              title="Generate new backup codes"
              size="sm"
              variant="outline"
              onPress={() => void newBackupCodes()}
              style={{ alignSelf: "flex-start" }}
            />
          ) : null}
          {clerkUser.passwordEnabled ? (
            <Button
              title="Change password"
              size="sm"
              variant="outline"
              icon={<KeyRound size={14} color={colors.foreground} />}
              onPress={() => setPwOpen(true)}
              style={{ alignSelf: "flex-start" }}
            />
          ) : null}
          {appLockAvailable ? (
            <SwitchField
              label="App lock"
              description="Require Face ID, Touch ID or fingerprint to open LegalFinder."
              value={appLock}
              onChange={(v) => void toggleLock(v)}
            />
          ) : null}
        </View>
      </Card>

      {pushAvailable() ? (
        <>
          <SectionTitle title="Notifications" />
          <Card>
            <SwitchField
              label="Push notifications"
              description="Hearing reminders, messages and case updates on this device."
              value={push}
              onChange={(v) => void togglePush(v)}
            />
          </Card>
        </>
      ) : null}

      <SectionTitle title="Privacy" />
      <Card>
        <SwitchField
          label="AI features"
          description="Let the legal assistant and AI-assisted drafting send what you type to Anthropic, which provides the AI model. Off: both ask again before they are used."
          value={aiConsent.allowed}
          onChange={(on) => void (on ? aiConsent.allow() : aiConsent.withdraw())}
        />
      </Card>

      <SectionTitle title="Appearance" />
      <Segmented<ThemePreference>
        value={preference}
        onChange={setPreference}
        options={[
          { value: "system", label: "System" },
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ]}
      />

      <SectionTitle title="Danger zone" />
      <Card style={{ borderColor: `${colors.destructive}66` }}>
        <Text variant="bodyStrong">Delete account</Text>
        <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
          Permanently deletes your account and sign-in access. Some case and payment records may be
          kept where the law requires.
        </Text>
        <Button
          title="Delete my account"
          variant="destructive"
          size="sm"
          loading={deleting}
          onPress={deleteAccount}
          style={{ marginTop: 12, alignSelf: "flex-start" }}
        />
      </Card>

      <Pressable accessibilityRole="button" onPress={() => router.push("/about")}>
        <Text variant="caption" tone="muted" align="center">
          LegalFinder {Constants.expoConfig?.version ?? ""}
        </Text>
      </Pressable>

      <Sheet visible={pwOpen} onClose={() => setPwOpen(false)} title="Change password">
        <Input
          label="Current password"
          value={currentPw}
          onChangeText={setCurrentPw}
          secureToggle
          autoComplete="current-password"
        />
        <Input
          label="New password"
          value={newPw}
          onChangeText={setNewPw}
          secureToggle
          autoComplete="new-password"
          hint="At least 8 characters."
        />
        <Button
          title="Update password"
          onPress={() => void changePassword()}
          loading={pwBusy}
          disabled={!currentPw || newPw.length < 8}
          fullWidth
        />
      </Sheet>
    </Screen>
  );
}

export default function SettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Settings" }} />
      <RequireAuth>
        <Settings />
      </RequireAuth>
    </>
  );
}
