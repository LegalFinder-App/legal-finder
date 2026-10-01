import { Platform, useWindowDimensions, type ViewStyle } from "react-native";

/** Window width from which the desktop app shows its sidebar instead of the bottom tab bar. */
const WIDE_FROM = 900;

/**
 * True in the desktop app when the window is wide enough for the sidebar layout. Phones — and for
 * now tablets, where the sidebar hasn't been tried — keep the tab bar at any width.
 */
export function useWideLayout(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= WIDE_FROM;
}

/** A centred column at a comfortable reading/form width, for wide windows. */
export const wideColumn: ViewStyle = { width: "100%", maxWidth: 920, alignSelf: "center" };

/**
 * wideColumn with page padding — add to a scroll view's contentContainerStyle when
 * useWideLayout() is true, so content stops stretching edge to edge.
 */
export const wideContent: ViewStyle = { ...wideColumn, paddingHorizontal: 32, paddingTop: 28 };

/**
 * Pads a list with nulls so the last row of a multi-column FlatList is full — otherwise its lone
 * cells stretch across the row. Render the nulls as empty `flex: 1` cells.
 */
export function padToColumns<T>(items: T[], columns: number): (T | null)[] {
  const missing = (columns - (items.length % columns)) % columns;
  return missing ? [...items, ...new Array<null>(missing).fill(null)] : items;
}
