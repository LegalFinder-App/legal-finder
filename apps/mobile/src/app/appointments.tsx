import { useState } from "react";
import { SectionList, View } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Button, EmptyState, ErrorState, LoadingRows, Segmented, Text } from "@/components/ui";
import { RequireAuth } from "@/components/RequireAuth";
import { AppointmentItem } from "@/features/shared/Items";
import { useSession } from "@/lib/session";
import { useNow } from "@/lib/time";
import { appointmentsQuery } from "@/lib/queries";

function Appointments() {
  const { colors } = useTheme();
  const { user, primaryRole } = useSession();
  const appts = useQuery(appointmentsQuery(user?.id));
  const [view, setView] = useState<"upcoming" | "past">("upcoming");
  const now = useNow();
  const all = appts.data ?? [];
  const rows =
    view === "upcoming"
      ? all.filter((a) => new Date(a.scheduled_at).getTime() >= now - 3_600_000)
      : all.filter((a) => new Date(a.scheduled_at).getTime() < now - 3_600_000).reverse();

  // Group by calendar day for a native agenda feel.
  const sections = Object.entries(
    rows.reduce<Record<string, typeof rows>>((acc, a) => {
      const day = new Date(a.scheduled_at).toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      (acc[day] ??= []).push(a);
      return acc;
    }, {}),
  ).map(([title, data]) => ({ title, data }));

  return (
    <SectionList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
      sections={appts.isLoading || appts.isError ? [] : sections}
      keyExtractor={(a) => a.id}
      stickySectionHeadersEnabled={false}
      refreshing={appts.isRefetching}
      onRefresh={() => void appts.refetch()}
      ListHeaderComponent={
        <View style={{ marginBottom: 12 }}>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: "upcoming", label: "Upcoming" },
              { value: "past", label: "Past" },
            ]}
          />
        </View>
      }
      renderSectionHeader={({ section }) => (
        <Text variant="eyebrow" tone="muted" style={{ marginTop: 16, marginBottom: 8 }}>
          {section.title}
        </Text>
      )}
      renderItem={({ item }) => (
        <View style={{ marginBottom: 10 }}>
          <AppointmentItem
            appointment={item}
            perspective={primaryRole === "lawyer" ? "lawyer" : "client"}
          />
        </View>
      )}
      ListEmptyComponent={
        appts.isLoading ? (
          <LoadingRows rows={3} />
        ) : appts.isError ? (
          <ErrorState
            message={(appts.error as Error).message}
            onRetry={() => void appts.refetch()}
          />
        ) : (
          <EmptyState
            icon={<CalendarDays size={22} color={colors.brass} />}
            title={view === "upcoming" ? "No upcoming appointments" : "No past appointments"}
            action={
              view === "upcoming" && primaryRole === "user" ? (
                <Button
                  title="Find an advocate"
                  size="sm"
                  onPress={() => router.push("/(tabs)/advocates")}
                />
              ) : undefined
            }
          />
        )
      }
    />
  );
}

export default function AppointmentsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Appointments" }} />
      <RequireAuth>
        <Appointments />
      </RequireAuth>
    </>
  );
}
