import { useEffect, useState } from "react";
import { Alert, Pressable, Share, View } from "react-native";
import { Stack, router } from "expo-router";
import { useClerk, useUser } from "@clerk/expo";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
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
import { isAppLockEnabled, setAppLockEnabled } from "@/components/BiometricGate";
import { useSession } from "@/lib/session";
import { updateProfilePhoto } from "@/lib/images";
import {
  disablePushNotifications,
  enablePushNotifications,
  pushPermissionGranted,
} from "@/lib/push";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { errorMessage, toast } from "@/lib/toast";

function Settings() {
  const { colors, preference, setPreference } = useTheme();
  const { user: clerkUser } = useUser();
  const clerk = useClerk();
  const { user } = useSession();
  const qc = useQueryClient();
  const [name, setName] = useState(user?.fullName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [appLock, setAppLock] = useState(false);
  const [push, setPush] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void isAppLockEnabled().then(setAppLock);
    void pushPermissionGranted().then(setPush);
  }, []);

  if (!user || !clerkUser) return null;

  const changePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      await updateProfilePhoto(result.assets[0], user.id);
      toast.success("Photo updated");
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't update your photo"));
    } finally {
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
      await Share.share({
        message: `LegalFinder backup codes (each works once):\n\n${backup.codes.join("\n")}`,
      });
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
  };

  const deleteAccount = () =>
    Alert.alert(
      "Delete your account?",
      "This permanently deletes your LegalFinder account, profile, messages and documents. It can't be undone.",
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
    <Screen keyboard>
      <PageHeading eyebrow="Account" title="Settings" />

      <Card>
        <View style={{ alignItems: "center", gap: 10 }}>
          <Avatar name={user.fullName ?? user.email} uri={clerkUser.imageUrl} size={84} />
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
          <SwitchField
            label="App lock"
            description="Require Face ID, Touch ID or fingerprint to open LegalFinder."
            value={appLock}
            onChange={(v) => void toggleLock(v)}
          />
        </View>
      </Card>

      <SectionTitle title="Notifications" />
      <Card>
        <SwitchField
          label="Push notifications"
          description="Hearing reminders, messages and case updates on this device."
          value={push}
          onChange={(v) => void togglePush(v)}
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
          Permanently removes your account and personal data from LegalFinder.
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
