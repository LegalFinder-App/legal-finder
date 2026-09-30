import { useState } from "react";
import { Platform, Pressable, StyleSheet, Switch, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Calendar, Check, ChevronDown } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius } from "@/theme/tokens";
import { Text } from "./Text";
import { Sheet } from "./Sheet";

function FieldLabel({ label }: { label: string }) {
  return (
    <Text variant="small" style={{ fontFamily: fonts.sansMedium, marginBottom: 6 }}>
      {label}
    </Text>
  );
}

function FieldBox({
  onPress,
  children,
  accessibilityLabel,
}: {
  onPress: () => void;
  children: React.ReactNode;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.box, { borderColor: colors.input, backgroundColor: colors.card }]}
    >
      {children}
    </Pressable>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = "Select…",
}: {
  label: string;
  value: T | null | undefined;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  placeholder?: string;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View>
      <FieldLabel label={label} />
      <FieldBox
        onPress={() => setOpen(true)}
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
      >
        <Text style={{ flex: 1, color: selected ? colors.foreground : colors.mutedForeground }}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color={colors.mutedForeground} />
      </FieldBox>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                void Haptics.selectionAsync();
                onChange(o.value);
                setOpen(false);
              }}
              style={[
                styles.option,
                {
                  borderColor: active ? colors.brass : colors.border,
                  backgroundColor: active ? colors.accent : colors.card,
                },
              ]}
            >
              <Text style={{ flex: 1 }}>{o.label}</Text>
              {active ? <Check size={18} color={colors.brass} /> : null}
            </Pressable>
          );
        })}
      </Sheet>
    </View>
  );
}

/** Date or date+time picker. Android shows the date then the time dialog in sequence. */
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

export function SwitchField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        {description ? (
          <Text variant="small" tone="muted" style={{ marginTop: 2 }}>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={(v) => {
          void Haptics.selectionAsync();
          onChange(v);
        }}
        trackColor={{ true: colors.brass, false: colors.border }}
        thumbColor={Platform.OS === "android" ? colors.card : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radius.lg,
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  option: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  done: { height: 48, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
});
