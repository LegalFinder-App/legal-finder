import { StatusBar, type StatusBarStyle } from "expo-status-bar";
import { useIsFocused } from "expo-router";

/**
 * Overrides the app-wide status bar style while this screen is focused — for screens whose top
 * edge is the dark ink hero rather than the page background (dark icons on navy are unreadable).
 * Only mounted while focused: status bar settings stack, so a permanently mounted override would
 * leak onto every screen pushed on top of this one.
 */
export function ScreenStatusBar({ style }: { style: StatusBarStyle }) {
  return useIsFocused() ? <StatusBar style={style} /> : null;
}
