import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import type { AlertButton } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import { Button, Text } from "@/components/ui";

// Desktop counterpart of alert.tsx: same call signature as Alert.alert, shown as an in-app dialog.

interface Request {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

let present: ((request: Request) => void) | null = null;

export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  const request = { title, message, buttons: buttons?.length ? buttons : [{ text: "OK" }] };
  // No host mounted (it only isn't during startup): fall back to the browser's own dialog so the
  // action is never silently dropped.
  if (!present) {
    const confirmed = globalThis.confirm([title, message].filter(Boolean).join("\n\n"));
    const chosen = confirmed
      ? request.buttons.find((b) => b.style !== "cancel")
      : request.buttons.find((b) => b.style === "cancel");
    chosen?.onPress?.();
    return;
  }
  present(request);
}

export function AlertHost() {
  const { colors } = useTheme();
  const [request, setRequest] = useState<Request | null>(null);

  useEffect(() => {
    present = setRequest;
    return () => {
      present = null;
    };
  }, []);

  if (!request) return null;

  const choose = (button?: AlertButton) => {
    setRequest(null);
    button?.onPress?.();
  };
  const cancel = () => choose(request.buttons.find((b) => b.style === "cancel"));
  // Two buttons sit side by side with the main action last; a longer list of choices stacks.
  const stacked = request.buttons.length > 2;
  const ordered = stacked
    ? request.buttons
    : [...request.buttons].sort(
        (a, b) => Number(a.style !== "cancel") - Number(b.style !== "cancel"),
      );

  return (
    <Modal transparent visible animationType="fade" onRequestClose={cancel}>
      <View style={styles.center}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
          onPress={cancel}
          accessibilityLabel="Close"
        />
        <View
          accessibilityRole="alert"
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text variant="h3" accessibilityRole="header">
            {request.title}
          </Text>
          {request.message ? <Text tone="muted">{request.message}</Text> : null}
          <View style={stacked ? styles.stack : styles.row}>
            {ordered.map((button, index) => (
              <Button
                key={`${button.text}-${index}`}
                title={button.text ?? "OK"}
                size="sm"
                variant={
                  button.style === "cancel"
                    ? "outline"
                    : button.style === "destructive"
                      ? "destructive"
                      : "brass"
                }
                onPress={() => choose(button)}
                fullWidth={stacked}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: {
    width: "100%",
    maxWidth: 440,
    borderWidth: 1,
    borderRadius: radius["2xl"],
    padding: 24,
    gap: 12,
  },
  row: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 8 },
  stack: { gap: 8, marginTop: 8 },
});
