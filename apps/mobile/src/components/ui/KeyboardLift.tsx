import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Lifts a bottom-anchored layout (a chat composer, a bottom sheet) above the keyboard.
 *
 * The app is edge-to-edge on Android, so the OS no longer resizes the window for the keyboard —
 * without this, whatever sits at the bottom ends up behind it. `automaticOffset` measures where the
 * view really is (under a stack header, inside a Modal) instead of guessing a header height. The
 * negative offset lets the keyboard cover the bottom safe-area padding the layout already reserves,
 * leaving `gap` between the content and the keys rather than a home-indicator-sized hole.
 */
export function KeyboardLift({
  children,
  style,
  gap,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** The layout's own minimum bottom padding (e.g. `Math.max(insets.bottom, gap)`). */
  gap: number;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      behavior="padding"
      automaticOffset
      keyboardVerticalOffset={-Math.max(insets.bottom - gap, 0)}
      style={style}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
