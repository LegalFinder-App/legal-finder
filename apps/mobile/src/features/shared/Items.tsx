import { Linking, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Bell, Briefcase, CalendarDays, FileText, Video } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Button, Card, StatusPill, Text } from "@/components/ui";
import { formatDateTime, formatRelative } from "@/lib/format";
import { env } from "@/lib/env";
import type { Appointment, CaseRow, NotificationRow } from "@/lib/queries";

function roomUrl(seed: string) {
  const slug = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${env.liveTrialRoomBase}/${slug || "legalfinder-courtroom"}`;
}

/** Same heuristic as the web's LiveCourtroomPanel for which appointments are video hearings. */
export function isVideoHearing(a: Appointment) {
  return /video|remote|live|hearing/i.test(`${a.mode} ${a.subject} ${a.notes ?? ""}`);
}

export function AppointmentItem({
  appointment,
  perspective,
}: {
  appointment: Appointment;
  perspective: "client" | "lawyer";
}) {
  const { colors } = useTheme();
  const other = perspective === "client" ? appointment.lawyer_name : appointment.client_name;
  const video = isVideoHearing(appointment);

  return (
    <Card>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.accent }]}>
          {video ? (
            <Video size={18} color={colors.brass} />
          ) : (
            <CalendarDays size={18} color={colors.brass} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {appointment.subject}
          </Text>
          <Text variant="small" tone="muted" numberOfLines={1}>
            {other ? `with ${other} · ` : ""}
            {formatDateTime(appointment.scheduled_at)}
          </Text>
        </View>
        <StatusPill value={appointment.status} />
      </View>
      {video ? (
        <Button
          title="Join video room"
          variant="outline"
          size="sm"
          icon={<Video size={14} color={colors.foreground} />}
          onPress={() => void Linking.openURL(roomUrl(appointment.subject || appointment.id))}
          style={{ marginTop: 12, alignSelf: "flex-start" }}
        />
      ) : null}
    </Card>
  );
}

export function MatterItem({ matter }: { matter: CaseRow }) {
  const { colors } = useTheme();
  return (
    <Card
      onPress={() => router.push(`/cases/${matter.id}`)}
      accessibilityLabel={`Case ${matter.title}`}
    >
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.accent }]}>
          <Briefcase size={18} color={colors.brass} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="mono" tone="brass">
            {matter.reference}
          </Text>
          <Text variant="bodyStrong" numberOfLines={1} style={{ marginTop: 2 }}>
            {matter.title}
          </Text>
          <Text variant="small" tone="muted" numberOfLines={1}>
            {matter.case_type} · {matter.court ?? "Court to be assigned"}
          </Text>
        </View>
        <StatusPill value={matter.status} />
      </View>
    </Card>
  );
}

export function NotificationItem({
  notification,
  onPress,
}: {
  notification: NotificationRow;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={notification.title}>
      <View style={styles.row}>
        <View
          style={[
            styles.icon,
            { backgroundColor: notification.read ? colors.muted : colors.accent },
          ]}
        >
          <Bell size={18} color={notification.read ? colors.mutedForeground : colors.brass} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {notification.title}
          </Text>
          <Text variant="small" tone="muted" numberOfLines={2}>
            {notification.body ?? "Open for details."}
          </Text>
        </View>
        <Text variant="caption" tone="muted">
          {formatRelative(notification.created_at)}
        </Text>
      </View>
    </Card>
  );
}

export function DocumentIcon() {
  const { colors } = useTheme();
  return (
    <View style={[styles.icon, { backgroundColor: colors.accent }]}>
      <FileText size={18} color={colors.brass} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
