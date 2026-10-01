import { StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/tokens";
import { Text } from "@/components/ui";
import type { SeriesPoint } from "@/lib/analytics";

/**
 * Horizontal bars for categories (case status, outcome). The web draws these as a column chart;
 * on a phone the category names wouldn't fit under the columns, so each gets its own row.
 */
export function BarList({
  data,
  color,
  formatValue = String,
}: {
  data: SeriesPoint[];
  color: string;
  formatValue?: (value: number) => string;
}) {
  const { colors } = useTheme();
  const max = Math.max(1, ...data.map((point) => point.value));

  return (
    <View style={styles.list}>
      {data.map((point) => (
        <View
          key={point.key}
          accessible
          accessibilityLabel={`${point.label}: ${formatValue(point.value)}`}
        >
          <View style={styles.row}>
            <Text variant="small" numberOfLines={1} style={styles.name}>
              {point.label}
            </Text>
            <Text variant="small" style={{ fontFamily: fonts.sansSemiBold }}>
              {formatValue(point.value)}
            </Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.fill,
                { backgroundColor: color, width: `${(point.value / max) * 100}%` },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 14 },
  row: { flexDirection: "row", alignItems: "baseline", gap: 12, marginBottom: 6 },
  name: { flex: 1 },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
});
