import { forwardRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius } from "@/theme/tokens";
import { Text } from "./Text";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
  multiline?: boolean;
  /** Renders a show/hide toggle and hides the value until toggled. */
  secureToggle?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, multiline, secureToggle, style, editable = true, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="small" style={{ fontFamily: fonts.sansMedium, marginBottom: 6 }}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            borderColor: error ? colors.destructive : focused ? colors.brass : colors.input,
            backgroundColor: editable ? colors.card : colors.muted,
            minHeight: multiline ? 110 : 48,
          },
        ]}
      >
        <TextInput
          ref={ref}
          placeholderTextColor={colors.mutedForeground}
          selectionColor={colors.brass}
          editable={editable}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          secureTextEntry={secureToggle ? hidden : rest.secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          accessibilityLabel={label ?? rest.placeholder}
          style={[
            styles.input,
            { color: colors.foreground, paddingTop: multiline ? 12 : 0 },
            style,
          ]}
          {...rest}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            hitSlop={10}
            onPress={() => setHidden((h) => !h)}
            style={styles.toggle}
          >
            {hidden ? (
              <Eye size={18} color={colors.mutedForeground} />
            ) : (
              <EyeOff size={18} color={colors.mutedForeground} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="small" tone="destructive" style={styles.below}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small" tone="muted" style={styles.below}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  field: {
    borderWidth: 1,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "stretch",
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    fontFamily: fonts.sans,
    fontSize: 15,
  },
  toggle: { justifyContent: "center", paddingHorizontal: 12 },
  below: { marginTop: 6 },
});
