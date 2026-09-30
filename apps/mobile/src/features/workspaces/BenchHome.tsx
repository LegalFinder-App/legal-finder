import { useState } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Gavel, Video } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { EmptyState, LoadingRows, PageHeading, Screen, Segmented, StatTile } from "@/components/ui";
import { AppointmentItem, isVideoHearing } from "@/features/shared/Items";
import { ContentManager } from "@/features/content/ContentManager";
import { CONTENT } from "@/features/content/configs";
import { useSession } from "@/lib/session";
import { useNow } from "@/lib/time";
import { appointmentsQuery, judgementsQuery } from "@/lib/queries";

export function BenchHome() {
  const { colors } = useTheme();
  const { user } = useSession();
  const judgements = useQuery(judgementsQuery);
  const appts = useQuery(appointmentsQuery(user?.id));
  const [tab, setTab] = useState<"hearings" | "judgements">("hearings");
  const now = useNow();
  const upcoming = (appts.data ?? []).filter(
    (a) => new Date(a.scheduled_at).getTime() > now - 3_600_000,
  );

  return (
    <Screen
      edges={["top", "left", "right"]}
      refreshing={appts.isRefetching}
      onRefresh={() => {
        void appts.refetch();
        void judgements.refetch();
      }}
    >
      <PageHeading
        eyebrow="Judiciary workspace"
        title="Bench"
        description="Your hearing calendar, live trial rooms and the public judgements archive."
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <StatTile
          label="Published judgements"
          value={judgements.data?.length ?? 0}
          icon={<Gavel size={14} color={colors.brass} />}
        />
        <StatTile
          label="Upcoming hearings"
          value={upcoming.length}
          icon={<CalendarDays size={14} color={colors.brass} />}
        />
        <StatTile
          label="Video hearings"
          value={upcoming.filter(isVideoHearing).length}
          icon={<Video size={14} color={colors.brass} />}
        />
      </View>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "hearings", label: "Hearing calendar" },
          { value: "judgements", label: "Judgements" },
        ]}
      />
      {tab === "hearings" ? (
        appts.isLoading ? (
          <LoadingRows rows={3} />
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarDays size={22} color={colors.brass} />}
            title="No hearings scheduled"
          />
        ) : (
          upcoming.map((a) => <AppointmentItem key={a.id} appointment={a} perspective="lawyer" />)
        )
      ) : (
        <ContentManager config={CONTENT.judgements} />
      )}
    </Screen>
  );
}
