import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/tokens";
import { Text } from "./Text";

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress?.();
      }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accent : colors.card,
          borderColor: selected ? colors.brass : colors.border,
        },
      ]}
    >
      <Text
        variant="small"
        style={{
          fontFamily: selected ? fonts.sansSemiBold : fonts.sans,
          color: selected ? colors.accentForeground : colors.foreground,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Horizontally scrolling single-select chip row (filters). */
export function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((o) => (
        <Chip
          key={o.value}
          label={o.label}
          selected={o.value === value}
          onPress={() => onChange(o.value)}
        />
      ))}
    </ScrollView>
  );
}

/** Segmented tabs for switching sections within a screen (the web's <Tabs>). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View
        style={[styles.segment, { backgroundColor: colors.secondary }]}
        accessibilityRole="tablist"
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                void Haptics.selectionAsync();
                onChange(o.value);
              }}
              style={[styles.segmentItem, active && { backgroundColor: colors.card }]}
            >
              <Text
                variant="small"
                style={{
                  fontFamily: active ? fonts.sansSemiBold : fonts.sansMedium,
                  color: active ? colors.foreground : colors.mutedForeground,
                }}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  row: { gap: 8, paddingVertical: 2 },
  segment: { flexDirection: "row", borderRadius: 10, padding: 3, gap: 2 },
  segmentItem: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
});
