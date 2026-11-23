import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Camera, ClipboardList, ExternalLink, Video } from "lucide-react";
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
  const activeHearing = liveHearings[0] ?? null;
  const roomSlug = activeHearing
    ? normalizeRoomSlug(activeHearing.subject || activeHearing.id)
    : null;
  const roomUrl = roomSlug
    ? `${trialRoomBase.replace(/\/$/, "")}/${roomSlug}`
    : null;

  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-plate sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <p className="eyebrow text-brass">Court operations</p>
          <h2 className="mt-1 font-display text-xl font-semibold">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Video hearings can open in a third-party meeting room (default Jitsi). This is a
            convenience link — not an official court recording, transcript or registry filing.
          </p>
        </div>
        {roomUrl ? (
          <Button asChild variant="brass" size="sm" className="rounded-xl">
            <a href={roomUrl} target="_blank" rel="noreferrer">
              Join meeting room <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        ) : (
          <Button variant="brass" size="sm" className="rounded-xl" disabled>
            Join meeting room
          </Button>
        )}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          {liveHearings.length === 0 ? (
            <EmptyState
              icon={<Video className="h-8 w-8" />}
              title="No video hearings scheduled"
              description="When you book a video or live hearing, a join link will appear here."
            />
          ) : (
            liveHearings.slice(0, 3).map((hearing) => {
              const isUpcoming = new Date(hearing.scheduled_at).getTime() > Date.now();
              return (
                <div
                  key={hearing.id}
                  className="rounded-xl border border-border/70 bg-secondary/25 p-4"
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
                      Third-party video room
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-border/70 bg-secondary/15 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-base font-semibold">Hearing workspace</p>
              <p className="text-xs text-muted-foreground">
                Documents on file for this account — open the meeting only when a hearing exists.
              </p>
            </div>
            <ClipboardList className="h-5 w-5 text-brass" />
          </div>

          <div className="rounded-lg bg-card/80 p-3 text-sm ring-1 ring-border/60">
            <p className="font-semibold">Meeting link</p>
            <p className="mt-1 break-all text-xs text-muted-foreground">
              {roomUrl ?? "Available once a video hearing is scheduled."}
            </p>
          </div>

          <div className="rounded-lg bg-card/80 p-3 text-sm ring-1 ring-border/60">
            <p className="font-semibold">Documents on file</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {documents.data?.length ?? 0} document(s) in your vault — share them yourself in the
              meeting if needed. LegalFinder does not record or transcribe the call.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
