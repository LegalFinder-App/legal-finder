import { useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import type { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import { Text } from "./Text";
import { Button } from "./Button";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.box, { borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.accent }]}>
        {icon ?? <Inbox size={22} color={colors.brass} />}
      </View>
      <Text variant="h3" align="center">
        {title}
      </Text>
      {description ? (
        <Text variant="small" tone="muted" align="center" style={styles.desc}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.box, { borderColor: `${colors.destructive}55` }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${colors.destructive}1f` }]}>
        <AlertTriangle size={22} color={colors.destructive} />
      </View>
      <Text variant="h3" align="center">
        Something went wrong
      </Text>
      <Text variant="small" tone="muted" align="center" style={styles.desc}>
        {message ?? "We couldn't load this right now. Check your connection and try again."}
      </Text>
      {onRetry ? (
        <View style={styles.action}>
          <Button title="Try again" variant="outline" size="sm" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

/** Pulsing placeholder rows, the native counterpart of the web's LoadingRows. */
export function LoadingRows({ rows = 3, height = 76 }: { rows?: number; height?: number }) {
  const { colors } = useTheme();
  // Lazy state (not a ref) so the Animated.Value is created once and is safe to read in render.
  const [pulse] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={{ gap: 12 }} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: rows }).map((_, i) => (
        <Animated.View
          key={i}
          style={{
            height,
            borderRadius: radius.xl,
            backgroundColor: colors.muted,
            opacity: pulse,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: radius.xl,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  desc: { maxWidth: 300 },
  action: { marginTop: 8 },
});
