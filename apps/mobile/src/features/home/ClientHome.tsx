import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  Bell,
  Briefcase,
  CalendarDays,
  FileText,
  MessageSquare,
  ScrollText,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react-native";
import type { ComponentType } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import {
  Button,
  Card,
  EmptyState,
  LoadingRows,
  Screen,
  SectionTitle,
  StatTile,
  Text,
} from "@/components/ui";
import { AppointmentItem, MatterItem, NotificationItem } from "@/features/shared/Items";
import { useSession } from "@/lib/session";
import { useNow } from "@/lib/time";
import {
  appointmentsQuery,
  conversationsQuery,
  documentsQuery,
  myCasesQuery,
  notificationsQuery,
} from "@/lib/queries";
import { enablePushNotifications, pushPermissionGranted } from "@/lib/push";
import { toast } from "@/lib/toast";

type Action = {
  icon: ComponentType<{ size?: number; color?: string }>;
  label: string;
  href: string;
};

const ACTIONS: Action[] = [
  { icon: Users, label: "Find advocate", href: "/(tabs)/advocates" },
  { icon: Sparkles, label: "Ask assistant", href: "/assistant" },
  { icon: FileText, label: "Documents", href: "/documents" },
  { icon: ShieldAlert, label: "Report", href: "/report" },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function ClientHome() {
  const { colors } = useTheme();
  const { user } = useSession();
  const [cases, appts, docs, convos, notes] = useQueries({
    queries: [
      myCasesQuery(user?.id),
      appointmentsQuery(user?.id),
      documentsQuery(user?.id),
      conversationsQuery(user?.id),
      notificationsQuery(user?.id),
    ],
  });
  const pushGranted = useQuery({ queryKey: ["push-permission"], queryFn: pushPermissionGranted });
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([
      cases.refetch(),
      appts.refetch(),
      docs.refetch(),
      convos.refetch(),
      notes.refetch(),
    ]);
    setRefreshing(false);
  };

  const now = useNow();
  const upcoming = (appts.data ?? []).filter(
    (a) => new Date(a.scheduled_at).getTime() > now - 3_600_000,
  );
  const openCases = (cases.data ?? []).filter((c) => c.status !== "closed");
  const firstName = user?.fullName?.split(" ")[0];

  return (
    <Screen
      edges={["top", "left", "right"]}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow" tone="brass">
            Client workspace
          </Text>
          <Text variant="h1" style={{ marginTop: 6 }}>
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => router.push("/notifications")}
          style={[styles.bell, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Bell size={20} color={colors.foreground} />
          {(notes.data ?? []).some((n) => !n.read) ? (
            <View style={[styles.dot, { backgroundColor: colors.brass }]} />
          ) : null}
        </Pressable>
      </View>

      <View style={styles.stats}>
        <StatTile
          label="Open matters"
          value={openCases.length}
          icon={<Briefcase size={14} color={colors.brass} />}
        />
        <StatTile
          label="Appointments"
          value={upcoming.length}
          icon={<CalendarDays size={14} color={colors.brass} />}
        />
        <StatTile
          label="Documents"
          value={(docs.data ?? []).length}
          icon={<FileText size={14} color={colors.brass} />}
        />
        <StatTile
          label="Conversations"
          value={(convos.data ?? []).length}
          icon={<MessageSquare size={14} color={colors.brass} />}
        />
      </View>

      <View style={styles.actions}>
        {ACTIONS.map(({ icon: Icon, label, href }) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => router.push(href as never)}
            style={styles.action}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.accent }]}>
              <Icon size={22} color={colors.brass} />
            </View>
            <Text variant="caption" align="center">
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {pushGranted.data === false ? (
        <Card>
          <Text variant="bodyStrong">Get notified instantly</Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            Hearing reminders, replies from your advocate and case updates — even when the app is
            closed.
          </Text>
          <Button
            title="Turn on notifications"
            size="sm"
            style={{ marginTop: 12, alignSelf: "flex-start" }}
            onPress={async () => {
              const result = await enablePushNotifications();
              if (result === "granted") toast.success("Notifications are on");
              else if (result === "denied")
                toast.error("Notifications are blocked", {
                  description: "Enable them in your phone's Settings.",
                });
              else toast.message("Notifications aren't available on this device yet");
              void pushGranted.refetch();
            }}
          />
        </Card>
      ) : null}

      <SectionTitle
        title="Upcoming appointments"
        action={
          <Pressable accessibilityRole="link" onPress={() => router.push("/appointments")}>
            <Text variant="small" tone="brass">
              All
            </Text>
          </Pressable>
        }
      />
      {appts.isLoading ? (
        <LoadingRows rows={2} />
      ) : upcoming.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} color={colors.brass} />}
          title="No upcoming appointments"
          description="Book a consultation from any advocate's profile."
          action={
            <Button
              title="Find an advocate"
              size="sm"
              onPress={() => router.push("/(tabs)/advocates")}
            />
          }
        />
      ) : (
        upcoming
          .slice(0, 3)
          .map((a) => <AppointmentItem key={a.id} appointment={a} perspective="client" />)
      )}

      <SectionTitle
        title="Your matters"
        action={
          <Pressable accessibilityRole="link" onPress={() => router.push("/cases")}>
            <Text variant="small" tone="brass">
              All
            </Text>
          </Pressable>
        }
      />
      {cases.isLoading ? (
        <LoadingRows rows={2} />
      ) : (cases.data ?? []).length === 0 ? (
        <EmptyState
          icon={<ScrollText size={22} color={colors.brass} />}
          title="No matters yet"
          description="Once an advocate opens a case for you, you'll follow every hearing and document here."
        />
      ) : (
        (cases.data ?? []).slice(0, 3).map((c) => <MatterItem key={c.id} matter={c} />)
      )}

      <SectionTitle title="Recent notifications" />
      {(notes.data ?? []).length === 0 ? (
        <EmptyState
          title="You're all caught up"
          description="Live updates about your cases and messages appear here."
        />
      ) : (
        (notes.data ?? [])
          .slice(0, 3)
          .map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onPress={() => router.push("/notifications")}
            />
          ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 8 },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { position: "absolute", top: 10, right: 11, width: 9, height: 9, borderRadius: 5 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actions: { flexDirection: "row", justifyContent: "space-between" },
  action: { alignItems: "center", gap: 6, width: "23%" },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
