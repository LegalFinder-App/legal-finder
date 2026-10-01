import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius } from "@/theme/tokens";
import { FieldLabel } from "./FieldParts";

// Desktop counterpart of DateTimeField.tsx: the native module behind the phone picker doesn't
// exist here, so this uses the browser engine's own date/time input — a real control with a
// calendar popup and full keyboard support — styled to match the other fields.

/** Local "YYYY-MM-DDTHH:mm" (or "YYYY-MM-DD"), which is what the input reads and writes. */
function toInputValue(date: Date, mode: "date" | "datetime"): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return mode === "date" ? day : `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

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
  return (
    <View>
      <FieldLabel label={label} />
      <input
        type={mode === "date" ? "date" : "datetime-local"}
        aria-label={label}
        value={value ? toInputValue(value, mode) : ""}
        min={minimumDate ? toInputValue(minimumDate, mode) : undefined}
        onChange={(event) => {
          const raw = event.target.value;
          // A date-only value parses as UTC midnight; add the time so it stays the chosen local day.
          const picked = new Date(mode === "date" ? `${raw}T00:00` : raw);
          if (raw && !Number.isNaN(picked.getTime())) onChange(picked);
        }}
        style={{
          height: 48,
          boxSizing: "border-box",
          width: "100%",
          padding: "0 14px",
          border: `1px solid ${colors.input}`,
          borderRadius: radius.lg,
          backgroundColor: colors.card,
          color: value ? colors.foreground : colors.mutedForeground,
          fontFamily: fonts.sans,
          fontSize: 15,
          colorScheme: scheme,
          outlineColor: colors.brass,
        }}
      />
    </View>
  );
}
