import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "@/components/ui";
import { monotonePath, niceTicks, type SeriesPoint } from "@/lib/analytics";
import { compactNumber } from "@/lib/format";

// Space kept clear inside the drawing: above the top gridline (a point's radius), below the
// baseline, and right of the last slot.
const TOP = 10;
const BOTTOM = 4;
const RIGHT = 4;
// Roughly one glyph of the axis font, for sizing the value gutter and thinning date labels.
const GLYPH = 6.4;

/**
 * A line or column chart over a time series — the app's counterpart of the web's recharts
 * LineChart/BarChart. Drawn with react-native-svg so it is the same on Android, iOS and desktop.
 * The web shows values in a hover tooltip; here the read-out above the chart follows the point
 * that was last tapped (or hovered, on desktop) and starts on the most recent one.
 */
export function SeriesChart({
  kind,
  data,
  color,
  formatValue = String,
  height = 180,
  emptyText,
}: {
  kind: "line" | "columns";
  data: SeriesPoint[];
  color: string;
  /** Formats a value for the read-out and for screen readers. */
  formatValue?: (value: number) => string;
  height?: number;
  /** Shown instead of a flat chart when every value is zero. */
  emptyText?: string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  if (data.length === 0 || (emptyText && data.every((point) => point.value === 0))) {
    return (
      <View style={[styles.empty, { minHeight: height }]}>
        <Text variant="small" tone="muted" align="center">
          {emptyText ?? "Nothing to show yet."}
        </Text>
      </View>
    );
  }

  const selected = Math.min(picked ?? data.length - 1, data.length - 1);
  const ticks = niceTicks(Math.max(...data.map((point) => point.value)));
  const ceiling = ticks[ticks.length - 1];
  const tickLabels = ticks.map(compactNumber);
  const gutter = Math.max(...tickLabels.map((label) => label.length)) * GLYPH + 10;
  const plotWidth = Math.max(0, width - gutter - RIGHT);
  const plotHeight = height - TOP - BOTTOM;
  const baseline = TOP + plotHeight;
  const slot = plotWidth / data.length;
  const xAt = (index: number) => gutter + slot * (index + 0.5);
  const yAt = (value: number) => TOP + plotHeight * (1 - value / ceiling);

  const line =
    kind === "line"
      ? monotonePath(data.map((point, i) => ({ x: xAt(i), y: yAt(point.value) })))
      : "";
  const barWidth = Math.min(28, slot * 0.62);

  // Date labels rarely all fit on a phone: keep every nth, counted back from the latest.
  const labelWidth = Math.max(...data.map((point) => point.axisLabel.length)) * GLYPH + 8;
  const every = slot > 0 ? Math.max(1, Math.ceil(labelWidth / slot)) : 1;

  return (
    <View onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}>
      <View style={styles.readout}>
        <Text variant="small" tone="muted">
          {data[selected].label}
        </Text>
        <Text variant="bodyStrong">{formatValue(data[selected].value)}</Text>
      </View>

      <View style={{ height }}>
        {width > 0 ? (
          <>
            <Svg width={width} height={height}>
              {ticks.map((tick) => (
                <Line
                  key={tick}
                  x1={gutter}
                  x2={width - RIGHT}
                  y1={yAt(tick)}
                  y2={yAt(tick)}
                  stroke={colors.border}
                  strokeWidth={1}
                />
              ))}
              {kind === "line" ? (
                <>
                  <Line
                    x1={xAt(selected)}
                    x2={xAt(selected)}
                    y1={TOP}
                    y2={baseline}
                    stroke={colors.border}
                    strokeWidth={1}
                  />
                  <Path
                    d={`${line} L${xAt(data.length - 1)} ${baseline} L${xAt(0)} ${baseline} Z`}
                    fill={color}
                    fillOpacity={0.12}
                  />
                  <Path
                    d={line}
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {data.map((point, i) => (
                    <Circle
                      key={point.key}
                      cx={xAt(i)}
                      cy={yAt(point.value)}
                      r={i === selected ? 5 : 3}
                      fill={i === selected ? color : colors.card}
                      stroke={color}
                      strokeWidth={2}
                    />
                  ))}
                </>
              ) : (
                data.map((point, i) =>
                  point.value > 0 ? (
                    <Rect
                      key={point.key}
                      x={xAt(i) - barWidth / 2}
                      y={yAt(point.value)}
                      width={barWidth}
                      height={baseline - yAt(point.value)}
                      rx={Math.min(4, barWidth / 2)}
                      fill={color}
                      fillOpacity={i === selected ? 1 : 0.6}
                    />
                  ) : null,
                )
              )}
            </Svg>

            {ticks.map((tick, i) => (
              <Text
                key={tick}
                variant="caption"
                tone="muted"
                allowFontScaling={false}
                style={[styles.tick, { top: yAt(tick) - 7, width: gutter - 6 }]}
              >
                {tickLabels[i]}
              </Text>
            ))}

            {data.map((point, i) => (
              <Pressable
                key={point.key}
                accessibilityRole="button"
                accessibilityLabel={`${point.label}: ${formatValue(point.value)}`}
                accessibilityState={{ selected: i === selected }}
                onPress={() => setPicked(i)}
                onHoverIn={() => setPicked(i)}
                style={[styles.column, { left: gutter + slot * i, width: slot, height }]}
              />
            ))}
          </>
        ) : null}
      </View>

      <View style={styles.labels}>
        {width > 0
          ? data.map((point, i) =>
              (data.length - 1 - i) % every === 0 ? (
                <Text
                  key={point.key}
                  variant="caption"
                  tone="muted"
                  allowFontScaling={false}
                  numberOfLines={1}
                  style={[
                    styles.label,
                    {
                      width: labelWidth,
                      left: Math.max(0, Math.min(xAt(i) - labelWidth / 2, width - labelWidth)),
                    },
                  ]}
                >
                  {point.axisLabel}
                </Text>
              ) : null,
            )
          : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  readout: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  tick: { position: "absolute", left: 0, textAlign: "right" },
  column: { position: "absolute", top: 0 },
  labels: { height: 16, marginTop: 6 },
  label: { position: "absolute", top: 0, textAlign: "center" },
});
