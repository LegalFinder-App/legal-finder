import { useState } from "react";
import { Pressable, View } from "react-native";
import { useUser } from "@clerk/expo";
import { Fingerprint, Trash2 } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Button, Text } from "@/components/ui";
import { errorMessage, toast } from "@/lib/toast";

export function PasskeyManager() {
  const { colors } = useTheme();
  const { user } = useUser();
  const [creating, setCreating] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const passkeys = user?.passkeys ?? [];

  const handleCreate = async () => {
    if (!user) return;
    setCreating(true);
    try {
      await user.createPasskey();
      toast.success("Passkey added", {
        description: "You can sign in on this device with Face ID, Touch ID, or your fingerprint.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/not allowed|cancel|cancelled|canceled/i.test(message)) {
        toast.error(message || "Unable to create passkey");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRemove = async (passkeyId: string) => {
    setRemovingId(passkeyId);
    try {
      const passkey = passkeys.find((p) => p.id === passkeyId);
      await passkey?.delete();
      toast.success("Passkey removed");
    } catch (error) {
      toast.error(errorMessage(error, "Unable to remove passkey"));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <Text variant="small" tone="muted">
        Passkeys need a native LegalFinder build and Clerk Dashboard native-app setup. They do not
        work in Expo Go.
      </Text>

      {passkeys.map((passkey) => (
        <View
          key={passkey.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <Fingerprint size={18} color={colors.brass} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600" }}>{passkey.name || "Passkey"}</Text>
              <Text variant="caption" tone="muted">
                Added {passkey.createdAt?.toLocaleDateString?.() ?? "recently"}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove passkey"
            disabled={removingId === passkey.id}
            onPress={() => void handleRemove(passkey.id)}
            hitSlop={8}
          >
            <Trash2 size={18} color={colors.destructive} />
          </Pressable>
        </View>
      ))}

      <Button
        title={creating ? "Adding…" : "Add a passkey"}
        variant="outline"
        onPress={() => void handleCreate()}
        loading={creating}
        disabled={!user || creating}
      />
    </View>
  );
}
