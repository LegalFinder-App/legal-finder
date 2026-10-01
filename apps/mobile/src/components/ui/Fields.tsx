import { useState } from "react";
import { Platform, Pressable, StyleSheet, Switch, View } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import { FieldBox, FieldLabel } from "./FieldParts";
import { Text } from "./Text";
import { Sheet } from "./Sheet";

export { DateTimeField } from "./DateTimeField";

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

// react-native-web's Switch paints the "on" thumb teal unless given its own (web-only) props.
const webSwitchProps: object | null =
  Platform.OS === "web" ? { activeThumbColor: "#ffffff", thumbColor: "#ffffff" } : null;

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
        {...webSwitchProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
});
