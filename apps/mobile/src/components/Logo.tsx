import { StyleSheet, View } from "react-native";
import { Scale } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/tokens";
import { Text } from "@/components/ui";

/** The web header mark: scales in a brass-edged tile + "Legal" / brass "Finder" wordmark. */
export function Logo({ onInk = false, size = 22 }: { onInk?: boolean; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityRole="image" accessibilityLabel="LegalFinder">
      <View
        style={[
          styles.tile,
          {
            width: size * 1.7,
            height: size * 1.7,
            borderColor: `${colors.brass}66`,
            backgroundColor: onInk ? "rgba(255,255,255,0.06)" : colors.accent,
          },
        ]}
      >
        <Scale size={size * 0.85} color={colors.brass} />
      </View>
      <Text
        style={{
          fontFamily: fonts.display,
          fontSize: size,
          color: onInk ? colors.inkForeground : colors.foreground,
        }}
      >
        Legal
        <Text style={{ fontFamily: fonts.display, fontSize: size, color: colors.brass }}>
          Finder
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  tile: { borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
