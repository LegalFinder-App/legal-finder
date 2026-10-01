import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router, usePathname, useSegments, type Href } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  CreditCard,
  FileText,
  Home,
  LogOut,
  MapPin,
  MessageSquare,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserSearch,
} from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius } from "@/theme/tokens";
import { Avatar, Button, Text } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { useWideLayout } from "@/lib/layout";
import { appSettingsQuery } from "@/lib/queries";
import { useUnreadCount } from "@/lib/realtime";
import { ROLE_LABELS, useSession } from "@/lib/session";
import { useSignOut } from "@/lib/sign-out";

interface Destination {
  label: string;
  href: Href;
  icon: typeof Home;
  /** Path prefixes that count as "inside" this destination (the first is its own path). */
  paths: string[];
  badge?: number;
}

function isActive(pathname: string, destination: Destination): boolean {
  return destination.paths.some((path) =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * The desktop layout: on a wide window a persistent sidebar replaces the phone's bottom tab bar
 * and its "More" screen, and stays put while screens change beside it. On a narrow window (and on
 * phones) it renders nothing extra. The sign-in screens get the whole window to themselves.
 *
 * The wrapper Views are rendered in both modes on purpose: switching the tree shape when the
 * window is resized would remount the navigator inside and lose where the user was.
 */
export function DesktopShell({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const wide = useWideLayout();
  const inAuthFlow = useSegments()[0] === "(auth)";
  const showSidebar = wide && !inAuthFlow;

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      {showSidebar ? <Sidebar /> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

function Sidebar() {
  const { colors } = useTheme();
  const pathname = usePathname();
  const { user, isSignedIn, primaryRole } = useSession();
  const settings = useQuery(appSettingsQuery);
  const unread = useUnreadCount();
  const signOut = useSignOut();

  // One section at a time: drop whatever was stacked on top of the tabs, then open the section, so
  // moving around the sidebar never builds up a long trail of "back" steps.
  const go = (href: Href) => {
    if (router.canDismiss()) router.dismissAll();
    router.navigate(href);
  };

  const main: Destination[] = [
    { label: "Home", href: "/(tabs)", icon: Home, paths: ["/"] },
    {
      label: "Advocates",
      href: "/(tabs)/advocates",
      icon: Scale,
      paths: ["/advocates", "/lawyers"],
    },
    {
      label: "Messages",
      href: "/(tabs)/messages",
      icon: MessageSquare,
      paths: ["/messages"],
      badge: unread,
    },
    {
      label: "Learn",
      href: "/(tabs)/learn",
      icon: BookOpen,
      paths: ["/learn", "/advice", "/news", "/judgements", "/library"],
    },
  ];
  const workspace: Destination[] = [
    { label: "Matters", href: "/cases", icon: Briefcase, paths: ["/cases"] },
    { label: "Appointments", href: "/appointments", icon: CalendarDays, paths: ["/appointments"] },
    { label: "Documents", href: "/documents", icon: FileText, paths: ["/documents"] },
    { label: "Payments", href: "/payments", icon: CreditCard, paths: ["/payments"] },
    { label: "Notifications", href: "/notifications", icon: Bell, paths: ["/notifications"] },
  ];
  // Same platform switches the More screen honours.
  const help: Destination[] = [
    ...(settings.data?.ai_assistant_enabled !== false
      ? [
          {
            label: "AI legal assistant",
            href: "/assistant",
            icon: Sparkles,
            paths: ["/assistant"],
          } satisfies Destination,
        ]
      : []),
    ...(settings.data?.incident_reporting_enabled !== false
      ? [
          {
            label: "Report an incident",
            href: "/report",
            icon: ShieldAlert,
            paths: ["/report"],
          } satisfies Destination,
        ]
      : []),
    { label: "Police stations", href: "/stations", icon: MapPin, paths: ["/stations"] },
    { label: "Safety & security", href: "/safety", icon: ShieldCheck, paths: ["/safety"] },
    ...(settings.data?.wanted_notices_enabled !== false
      ? [
          {
            label: "Public notices",
            href: "/wanted",
            icon: UserSearch,
            paths: ["/wanted"],
          } satisfies Destination,
        ]
      : []),
  ];

  const renderItem = (destination: Destination) => {
    const active = isActive(pathname, destination);
    const Icon = destination.icon;
    return (
      <Pressable
        key={destination.label}
        accessibilityRole="link"
        accessibilityLabel={destination.label}
        accessibilityState={{ selected: active }}
        onPress={() => go(destination.href)}
        style={({ hovered }: { hovered?: boolean }) => [
          styles.item,
          { backgroundColor: active ? colors.accent : hovered ? colors.muted : "transparent" },
        ]}
      >
        <Icon size={18} color={active ? colors.brass : colors.mutedForeground} />
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: active ? fonts.sansSemiBold : fonts.sansMedium,
            fontSize: 14,
            color: active ? colors.foreground : colors.mutedForeground,
          }}
        >
          {destination.label}
        </Text>
        {destination.badge ? (
          <View style={[styles.badge, { backgroundColor: colors.brass }]}>
            <Text
              style={{
                fontFamily: fonts.sansSemiBold,
                fontSize: 11,
                color: colors.brassForeground,
              }}
            >
              {destination.badge > 99 ? "99+" : destination.badge}
            </Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  const smallLink = (label: string, href: Href) => (
    <Pressable key={label} accessibilityRole="link" onPress={() => go(href)}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View
      role="navigation"
      style={[styles.sidebar, { backgroundColor: colors.card, borderRightColor: colors.border }]}
    >
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="LegalFinder home"
        onPress={() => go("/(tabs)")}
        style={styles.brand}
      >
        <Logo size={19} />
      </Pressable>

      <ScrollView contentContainerStyle={styles.sections} showsVerticalScrollIndicator={false}>
        <View style={styles.group}>{main.map(renderItem)}</View>

        {isSignedIn ? (
          <View style={styles.group}>
            <Text variant="eyebrow" tone="muted" style={styles.heading}>
              Your workspace
            </Text>
            {workspace.map(renderItem)}
          </View>
        ) : null}

        <View style={styles.group}>
          <Text variant="eyebrow" tone="muted" style={styles.heading}>
            Help &amp; safety
          </Text>
          {help.map(renderItem)}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {isSignedIn && user ? (
          <View style={styles.account}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Your profile and settings"
              onPress={() => go("/settings")}
              style={({ hovered }: { hovered?: boolean }) => [
                styles.profile,
                { backgroundColor: hovered ? colors.muted : "transparent" },
              ]}
            >
              <Avatar name={user.fullName ?? user.email} uri={user.imageUrl} size={34} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontFamily: fonts.sansSemiBold, fontSize: 13 }}>
                  {user.fullName ?? user.email}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {ROLE_LABELS[primaryRole]} · Settings
                </Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              onPress={signOut}
              style={({ hovered }: { hovered?: boolean }) => [
                styles.iconButton,
                { backgroundColor: hovered ? colors.muted : "transparent" },
              ]}
            >
              <LogOut size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <Button title="Sign in" size="sm" onPress={() => router.push("/(auth)/sign-in")} />
            <Button
              title="Create account"
              size="sm"
              variant="outline"
              onPress={() => router.push("/(auth)/sign-up")}
            />
          </View>
        )}
        <View style={styles.smallLinks}>
          {smallLink("About", "/about")}
          {smallLink("Terms", "/legal/terms")}
          {smallLink("Privacy", "/legal/privacy")}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: "row" },
  content: { flex: 1 },
  sidebar: { width: 256, borderRightWidth: StyleSheet.hairlineWidth },
  brand: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 14 },
  sections: { paddingHorizontal: 12, paddingBottom: 16, gap: 18 },
  group: { gap: 2 },
  heading: { marginLeft: 10, marginBottom: 6 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: radius.lg,
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { padding: 12, gap: 10, borderTopWidth: StyleSheet.hairlineWidth },
  account: { flexDirection: "row", alignItems: "center", gap: 4 },
  profile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 6,
    borderRadius: radius.lg,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  smallLinks: { flexDirection: "row", gap: 14, paddingHorizontal: 6 },
});
