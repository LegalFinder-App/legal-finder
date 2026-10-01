import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BookOpen, Home, Menu, MessageSquare, Scale } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/tokens";
import { useWideLayout } from "@/lib/layout";
import { useUnreadCount } from "@/lib/realtime";

export default function TabsLayout() {
  const { colors } = useTheme();
  const unread = useUnreadCount();
  // Android is edge-to-edge, so the bar must clear the system navigation bar itself (3-button
  // nav is ~48dp); a fixed padding put the tab labels underneath it.
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);
  // On a wide desktop window the sidebar (DesktopShell) is the navigation.
  const wide = useWideLayout();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 18 },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.brass,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 11 },
        tabBarStyle: wide
          ? { display: "none" }
          : {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              height: 58 + bottom,
              paddingTop: 6,
              paddingBottom: bottom,
            },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="advocates"
        options={{
          title: "Advocates",
          tabBarIcon: ({ color, size }) => <Scale color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
          tabBarBadge: unread > 0 ? (unread > 99 ? "99+" : unread) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.brass,
            color: colors.brassForeground,
            fontFamily: fonts.sansSemiBold,
          },
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: "Learn",
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
