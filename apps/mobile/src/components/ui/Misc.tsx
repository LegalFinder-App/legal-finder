import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { Image } from "expo-image";
import { ChevronRight, Star } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius } from "@/theme/tokens";
import { mediaUrl } from "@/lib/media";
import { Text } from "./Text";

export function Avatar({
  name,
  uri,
  size = 44,
}: {
  name?: string | null;
  uri?: string | null;
  size?: number;
}) {
  const { colors } = useTheme();
  const initials =
    (name ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "LF";

  const source = mediaUrl(uri);
  if (source) {
    return (
      <Image
        source={{ uri: source }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.muted }}
        contentFit="cover"
        transition={150}
        accessibilityLabel={name ? `${name}'s photo` : "Profile photo"}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.accent,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontFamily: fonts.sansSemiBold,
          fontSize: size * 0.36,
          color: colors.accentForeground,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{ flexDirection: "row", gap: 2 }}
      accessibilityLabel={`${value.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          color={colors.brass}
          fill={n <= Math.round(value) ? colors.brass : "transparent"}
        />
      ))}
    </View>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }, style]} />
  );
}

/** Tappable settings/menu row with icon, title, optional subtitle and chevron. */
export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  right,
  destructive,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.secondary }]}
    >
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: colors.accent }]}>{icon}</View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" tone={destructive ? "destructive" : "default"}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" tone="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <ChevronRight size={18} color={colors.mutedForeground} /> : null)}
    </Pressable>
  );
}

export function Tag({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: colors.accent }]}>
      <Text
        variant="caption"
        style={{ fontFamily: fonts.sansSemiBold, color: colors.accentForeground }}
      >
        {label}
      </Text>
    </View>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  style,
}: {
  /** Keep it to about a dozen characters: two tiles share a phone's width. */
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }, style]}
    >
      <View style={styles.statTop}>
        <Text variant="eyebrow" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Text>
        {icon}
      </View>
      <Text variant="h1" style={{ marginTop: 6 }}>
        {value}
      </Text>
      {hint ? (
        <Text variant="small" tone="muted" style={{ marginTop: 2 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: radius.lg,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  stat: {
    flex: 1,
    minWidth: 140,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    padding: 14,
  },
  statTop: { flexDirection: "row", alignItems: "center", gap: 8 },
});
