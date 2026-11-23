import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Gavel, Video } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/common/bits";
import { ContentCrudTable } from "@/components/app/admin/content/content-crud-table";
import { judgementsConfig } from "@/components/app/admin/content/configs/judgements";
import { LiveCourtroomPanel } from "@/components/app/live-courtroom-panel";
import { HearingCalendar } from "./shared/hearing-calendar";
import { appointmentsQuery, judgementsQuery } from "@/lib/queries";
import { useSession } from "@/lib/session";

export function BenchWorkspace() {
  const { user } = useSession();
  const judgements = useQuery(judgementsQuery);
  const appointments = useQuery(appointmentsQuery(user?.id));

  const videoHearings = useMemo(
    () =>
      (appointments.data ?? []).filter((appointment) =>
        /video|remote|live|hearing/i.test(
          `${appointment.mode} ${appointment.subject} ${appointment.notes ?? ""}`,
        ),
      ).length,
    [appointments.data],
  );
  const upcoming = useMemo(
    () =>
      (appointments.data ?? []).filter(
        (appointment) => new Date(appointment.scheduled_at).getTime() >= Date.now(),
      ).length,
    [appointments.data],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow text-brass">Judiciary workspace</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Bench</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Review the hearing calendar, open scheduled video rooms and publish judgements to the public
        archive.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Published judgements"
          value={judgements.data?.length ?? 0}
          icon={<Gavel className="h-4 w-4" />}
        />
        <StatCard
          label="Video hearings"
          value={videoHearings}
          hint="On your calendar"
          icon={<Video className="h-4 w-4" />}
        />
        <StatCard
          label="Upcoming appointments"
          value={upcoming}
          icon={<CalendarDays className="h-4 w-4" />}
        />
      </div>

      <div className="mt-8">
        <LiveCourtroomPanel title="Live court trials" />
      </div>

      <Tabs defaultValue="calendar" className="mt-10">
        <TabsList>
          <TabsTrigger value="calendar">
            <CalendarDays className="mr-1.5 h-4 w-4" /> Hearing calendar
          </TabsTrigger>
          <TabsTrigger value="judgements">
            <Gavel className="mr-1.5 h-4 w-4" /> Judgements
          </TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="mt-6">
          <HearingCalendar />
        </TabsContent>
        <TabsContent value="judgements" className="mt-6">
          <ContentCrudTable config={judgementsConfig} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
