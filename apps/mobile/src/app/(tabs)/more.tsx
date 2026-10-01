import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Briefcase,
  CalendarDays,
  CreditCard,
  FileText,
  Info,
  LogOut,
  MapPin,
  Scale,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserSearch,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import { Avatar, Button, Card, Divider, ListRow, Screen, Text } from "@/components/ui";
import { ROLE_LABELS, useSession } from "@/lib/session";
import { appSettingsQuery } from "@/lib/queries";
import { useSignOut } from "@/lib/sign-out";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="eyebrow" tone="muted" style={{ marginLeft: 4 }}>
        {title}
      </Text>
      <Card padded={false} style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
        {children}
      </Card>
    </View>
  );
}

export default function MoreTab() {
  const { colors } = useTheme();
  const { user, isSignedIn, roles, primaryRole } = useSession();
  const settings = useQuery(appSettingsQuery);
  const icon = (I: typeof Bell) => <I size={18} color={colors.brass} />;

  const signOut = useSignOut();

  return (
    <Screen>
      {isSignedIn && user ? (
        <Card
          onPress={() => router.push("/settings")}
          accessibilityLabel="Your profile and settings"
        >
          <View style={styles.profile}>
            <Avatar name={user.fullName ?? user.email} uri={user.imageUrl} size={56} />
            <View style={{ flex: 1 }}>
              <Text variant="h3">{user.fullName ?? "Your account"}</Text>
              <Text variant="small" tone="muted">
                {user.email}
              </Text>
              <Text variant="eyebrow" tone="brass" style={{ marginTop: 4 }}>
                {roles.length > 1
                  ? roles.map((r) => ROLE_LABELS[r]).join(" · ")
                  : ROLE_LABELS[primaryRole]}
              </Text>
            </View>
          </View>
        </Card>
      ) : (
        <Card>
          <Text variant="h3">Your LegalFinder account</Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            Sign in to book consultations, message advocates and follow your matters.
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <Button
              title="Sign in"
              onPress={() => router.push("/(auth)/sign-in")}
              style={{ flex: 1 }}
            />
            <Button
              title="Create account"
              variant="outline"
              onPress={() => router.push("/(auth)/sign-up")}
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      )}

      {isSignedIn ? (
        <Group title="Your workspace">
          <ListRow
            icon={icon(Briefcase)}
            title="Matters"
            subtitle="Cases, hearings and deadlines"
            onPress={() => router.push("/cases")}
          />
          <Divider />
          <ListRow
            icon={icon(CalendarDays)}
            title="Appointments"
            onPress={() => router.push("/appointments")}
          />
          <Divider />
          <ListRow
            icon={icon(FileText)}
            title="Documents"
            subtitle="Your secure vault"
            onPress={() => router.push("/documents")}
          />
          <Divider />
          <ListRow
            icon={icon(CreditCard)}
            title="Payments"
            onPress={() => router.push("/payments")}
          />
          <Divider />
          <ListRow
            icon={icon(Bell)}
            title="Notifications"
            onPress={() => router.push("/notifications")}
          />
        </Group>
      ) : null}

      <Group title="Help & safety">
        {settings.data?.ai_assistant_enabled !== false ? (
          <>
            <ListRow
              icon={icon(Sparkles)}
              title="AI legal assistant"
              subtitle="Plain-language answers, pointed to the right help"
              onPress={() => router.push("/assistant")}
            />
            <Divider />
          </>
        ) : null}
        {settings.data?.incident_reporting_enabled !== false ? (
          <>
            <ListRow
              icon={icon(ShieldAlert)}
              title="Report an incident"
              subtitle="Anonymously if you need to"
              onPress={() => router.push("/report")}
            />
            <Divider />
          </>
        ) : null}
        <ListRow
          icon={icon(MapPin)}
          title="Police stations"
          subtitle="Nearest stations and contacts"
          onPress={() => router.push("/stations")}
        />
        <Divider />
        <ListRow
          icon={icon(ShieldCheck)}
          title="Safety & security"
          onPress={() => router.push("/safety")}
        />
        {settings.data?.wanted_notices_enabled !== false ? (
          <>
            <Divider />
            <ListRow
              icon={icon(UserSearch)}
              title="Public notices"
              subtitle="Wanted persons published by police"
              onPress={() => router.push("/wanted")}
            />
          </>
        ) : null}
      </Group>

      <Group title="LegalFinder">
        {isSignedIn ? (
          <>
            <ListRow
              icon={icon(Settings)}
              title="Settings"
              subtitle="Profile, security, notifications, appearance"
              onPress={() => router.push("/settings")}
            />
            <Divider />
          </>
        ) : null}
        <ListRow
          icon={icon(Info)}
          title="About LegalFinder"
          onPress={() => router.push("/about")}
        />
        <Divider />
        <ListRow
          icon={icon(ScrollText)}
          title="Terms of Service"
          onPress={() => router.push("/legal/terms")}
        />
        <Divider />
        <ListRow
          icon={icon(Scale)}
          title="Privacy Policy"
          onPress={() => router.push("/legal/privacy")}
        />
      </Group>

      {isSignedIn ? (
        <Card padded={false} style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
          <ListRow
            icon={<LogOut size={18} color={colors.destructive} />}
            title="Sign out"
            destructive
            onPress={signOut}
            right={<View />}
          />
        </Card>
      ) : null}

      <Text variant="caption" tone="muted" align="center" style={{ marginTop: 8 }}>
        LegalFinder is an independent, privately operated platform and is not affiliated with the
        Government of Uganda, the Judiciary or the Uganda Police Force.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: "row", gap: 14, alignItems: "center" },
});
