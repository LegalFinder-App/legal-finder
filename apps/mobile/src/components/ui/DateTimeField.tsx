import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Calendar } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius } from "@/theme/tokens";
import { FieldBox, FieldLabel } from "./FieldParts";
import { Sheet } from "./Sheet";
import { Text } from "./Text";

/**
 * Date or date+time picker. Android shows the date then the time dialog in sequence. The desktop
 * build uses DateTimeField.web.tsx (the browser engine's own picker).
 */
export function DateTimeField({
  label,
  value,
  onChange,
  mode = "datetime",
  minimumDate,
}: {
  label: string;
  value: Date | null;
  onChange: (value: Date) => void;
  mode?: "date" | "datetime";
  minimumDate?: Date;
}) {
  const { colors, scheme } = useTheme();
  const [step, setStep] = useState<"closed" | "date" | "time">("closed");
  const [draft, setDraft] = useState<Date>(value ?? new Date());

  const display = value
    ? mode === "date"
      ? value.toLocaleDateString(undefined, { dateStyle: "medium" })
      : value.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "Choose…";

  const handle = (event: DateTimePickerEvent, picked?: Date) => {
    if (event.type === "dismissed" || !picked) {
      setStep("closed");
      return;
    }
    if (Platform.OS === "android") {
      if (step === "date" && mode === "datetime") {
        setDraft(picked);
        setStep("time");
        return;
      }
      const merged =
        step === "time"
          ? new Date(
              draft.getFullYear(),
              draft.getMonth(),
              draft.getDate(),
              picked.getHours(),
              picked.getMinutes(),
            )
          : picked;
      setStep("closed");
      onChange(merged);
      return;
    }
    setDraft(picked);
  };

  return (
    <View>
      <FieldLabel label={label} />
      <FieldBox onPress={() => setStep("date")} accessibilityLabel={`${label}: ${display}`}>
        <Calendar size={16} color={colors.mutedForeground} />
        <Text style={{ flex: 1, color: value ? colors.foreground : colors.mutedForeground }}>
          {display}
        </Text>
      </FieldBox>

      {Platform.OS === "android" && step !== "closed" ? (
        <DateTimePicker
          value={draft}
          mode={step === "time" ? "time" : "date"}
          minimumDate={step === "date" ? minimumDate : undefined}
          onChange={handle}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Sheet visible={step !== "closed"} onClose={() => setStep("closed")} title={label}>
          <DateTimePicker
            value={draft}
            mode={mode}
            display="inline"
            minimumDate={minimumDate}
            themeVariant={scheme}
            accentColor={colors.brass}
            onChange={handle}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onChange(draft);
              setStep("closed");
            }}
            style={[styles.done, { backgroundColor: colors.brass }]}
          >
            <Text style={{ color: colors.brassForeground, fontFamily: fonts.sansSemiBold }}>
              Done
            </Text>
          </Pressable>
        </Sheet>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  done: { height: 48, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
});
