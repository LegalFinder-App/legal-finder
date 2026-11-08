import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { isSameDay } from "date-fns";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { EmptyState, LoadingRows, StatusPill } from "@/components/common/bits";
import { appointmentsQuery } from "@/lib/queries";
import { useSession } from "@/lib/session";

/** Calendar + day list of scheduled appointments/hearings — shared by the bench and practice workspaces. */
export function HearingCalendar() {
  const { user } = useSession();
  const appts = useQuery(appointmentsQuery(user?.id));
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);

  const rows = useMemo(() => appts.data ?? [], [appts.data]);
  const hearingDates = useMemo(() => rows.map((a) => new Date(a.scheduled_at)), [rows]);
  const dayHearings = useMemo(() => {
    if (!selectedDay) return rows;
    return rows.filter((a) => isSameDay(new Date(a.scheduled_at), selectedDay));
  }, [rows, selectedDay]);

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
      <div className="card p-3">
        <Calendar
          mode="single"
          selected={selectedDay}
          onSelect={setSelectedDay}
          modifiers={{ hasHearing: hearingDates }}
          modifiersClassNames={{ hasHearing: "bg-brass/20 font-semibold text-brass" }}
        />
        {selectedDay && (
          <button
            type="button"
            onClick={() => setSelectedDay(undefined)}
            className="mt-1 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Show all upcoming
          </button>
        )}
      </div>

      <div>
        <h2 className="font-display text-xl font-semibold">
          {selectedDay
            ? selectedDay.toLocaleDateString(undefined, { dateStyle: "full" })
            : "Upcoming hearings"}
        </h2>
        <div className="mt-4 space-y-3">
          {appts.isLoading ? (
            <LoadingRows rows={3} />
          ) : dayHearings.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="h-8 w-8" />}
              title="No hearings"
              description="Scheduled hearings from the appointments calendar will appear here."
            />
          ) : (
            dayHearings.map((hearing) => (
              <div key={hearing.id} className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display font-semibold">{hearing.subject}</p>
                  <StatusPill value={hearing.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(hearing.scheduled_at).toLocaleString()} · {hearing.mode}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
