import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Camera, ClipboardList, ExternalLink, Mic, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, StatusPill } from "@/components/common/bits";
import { appointmentsQuery, documentsQuery } from "@/lib/queries";
import { useSession } from "@/lib/session";

function normalizeRoomSlug(seed: string) {
  return seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function LiveCourtroomPanel({ title = "Live court trials" }: { title?: string }) {
  const { user } = useSession();
  const appointments = useQuery(appointmentsQuery(user?.id));
  const documents = useQuery(documentsQuery(user?.id));

  const liveHearings = useMemo(
    () =>
      (appointments.data ?? []).filter((appointment) =>
        /video|remote|live|hearing/i.test(
          `${appointment.mode} ${appointment.subject} ${appointment.notes ?? ""}`,
        ),
      ),
    [appointments.data],
  );

  const trialRoomBase = import.meta.env.VITE_LIVE_TRIAL_ROOM_BASE_URL || "https://meet.jit.si";
  const activeHearing = liveHearings[0] ?? (appointments.data ?? [])[0] ?? null;
  const roomSlug = activeHearing
    ? normalizeRoomSlug(activeHearing.subject || activeHearing.id)
    : "legalfinder-courtroom";
  const roomUrl = `${trialRoomBase.replace(/\/$/, "")}/${roomSlug}`;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-plate">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="eyebrow text-brass">Court operations</p>
          <h2 className="mt-1 font-display text-xl font-semibold">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Hearings can be launched as live video rooms, with the hearing record, evidence
            checklist and documents shown alongside the session.
          </p>
        </div>
        <Button asChild variant="brass" size="sm" disabled={!activeHearing}>
          <a href={roomUrl} target="_blank" rel="noreferrer">
            Join courtroom room <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          {liveHearings.length === 0 ? (
            <EmptyState
              icon={<Video className="h-8 w-8" />}
              title="No live hearings scheduled"
              description="Mark an appointment as video, remote or live hearing to surface it here."
            />
          ) : (
            liveHearings.slice(0, 3).map((hearing) => {
              const isUpcoming = new Date(hearing.scheduled_at).getTime() > Date.now();
              return (
                <div
                  key={hearing.id}
                  className="rounded-lg border border-border bg-secondary/30 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-base font-semibold">{hearing.subject}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {hearing.client_name ?? "Client matter"} · {hearing.mode}
                      </p>
                    </div>
                    <StatusPill value={isUpcoming ? "pending" : "active"} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {new Date(hearing.scheduled_at).toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5" />
                      Live room ready
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Mic className="h-3.5 w-3.5" />
                      Audio and transcript notes
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-base font-semibold">Hearing workspace</p>
              <p className="text-xs text-muted-foreground">
                Open the live room, review filings and track evidence.
              </p>
            </div>
            <ClipboardList className="h-5 w-5 text-brass" />
          </div>

          <div className="rounded-md bg-secondary/40 p-3 text-sm text-foreground/85">
            <p className="font-semibold">Room link</p>
            <p className="mt-1 break-all text-xs text-muted-foreground">{roomUrl}</p>
          </div>

          <div className="rounded-md bg-secondary/40 p-3 text-sm text-foreground/85">
            <p className="font-semibold">Available evidence</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {documents.data?.length ?? 0} document(s) ready for presentation and sharing during
              the hearing.
            </p>
          </div>

          <div className="rounded-md bg-secondary/40 p-3 text-sm text-foreground/85">
            <p className="font-semibold">Live trial flow</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The courtroom room can be opened on iOS, Android, macOS, Windows and Linux through the
              same web bundle, with installable PWA support for browsers that expose it.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
