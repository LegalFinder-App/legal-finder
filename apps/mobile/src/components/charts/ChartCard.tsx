import { Children, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Card, Text } from "@/components/ui";
import { useWideLayout } from "@/lib/layout";

/** A titled card around one chart — the web's SectionHeading + chart section. */
export function ChartCard({
  eyebrow,
  title,
  note,
  children,
}: {
  eyebrow: string;
  title: string;
  /** A caveat about the data (e.g. that it is a sample). */
  note?: string;
  children: ReactNode;
}) {
  return (
    <Card style={styles.card}>
      <Text variant="eyebrow" tone="brass">
        {eyebrow}
      </Text>
      <Text variant="h3" accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {note ? (
        <Text variant="small" tone="muted" style={styles.note}>
          {note}
        </Text>
      ) : null}
      <View style={styles.body}>{children}</View>
    </Card>
  );
}

/** One column of cards on a phone, two side by side on a wide desktop window. */
export function ChartGrid({ children }: { children: ReactNode }) {
  const wide = useWideLayout();
  return (
    <View style={[styles.grid, wide && styles.gridWide]}>
      {Children.map(children, (child) =>
        child ? <View style={wide ? styles.cellWide : undefined}>{child}</View> : null,
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Grows to its row's height when two cards sit side by side.
  card: { flexGrow: 1 },
  title: { marginTop: 4 },
  note: { marginTop: 2 },
  body: { marginTop: 14 },
  grid: { gap: 16 },
  gridWide: { flexDirection: "row", flexWrap: "wrap" },
  cellWide: { flexBasis: "45%", flexGrow: 1, minWidth: 0 },
});
