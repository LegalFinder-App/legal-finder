import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Briefcase, CalendarDays, FileText, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, StatusPill } from "@/components/common/bits";
import { StatCardRow } from "./shared/stat-card-row";
import { MattersList } from "./shared/matters-list";
import { AppointmentsList } from "./shared/appointments-list";
import { DocumentVault } from "./shared/document-vault";
import { PushRegistrationCard } from "./shared/push-registration-card";
import { PwaInstallCard } from "./shared/pwa-install-card";
import { useSession } from "@/lib/session";
import {
  myCasesQuery,
  appointmentsQuery,
  documentsQuery,
  conversationsQuery,
  notificationsQuery,
} from "@/lib/queries";
import { DEMO_APPOINTMENTS, DEMO_CASES } from "@/lib/demo-data";
import { requestBrowserNotificationPermission } from "@/lib/platform-notifications";

export function ClientWorkspace() {
  const { user } = useSession();
  const navigate = useNavigate();
  const search = useRouterState({ select: (state) => state.location.search });
  const cases = useQuery(myCasesQuery(user?.id));
  const appts = useQuery(appointmentsQuery(user?.id));
  const docs = useQuery(documentsQuery(user?.id));
  const convos = useQuery(conversationsQuery(user?.id));
  const notifications = useQuery(notificationsQuery(user?.id));

  useEffect(() => {
    const params = new URLSearchParams(search);
    const payment = params.get("payment");
    if (!payment) return;

    if (payment === "completed") {
      toast.success("Payment received", { description: "Your consultation fee has been paid." });
    } else if (payment === "failed") {
      toast.error("Payment failed", {
        description: "The consultation fee payment didn't go through.",
      });
    } else if (payment === "pending") {
      toast.message("Payment pending", {
        description: "We'll confirm once Pesapal finishes processing it.",
      });
    } else if (payment === "error") {
      toast.error("We couldn't confirm that payment", {
        description: "If money left your account, contact support and reference your appointment.",
      });
    }

    navigate({ to: "/dashboard", replace: true });
  }, [search, navigate]);

  const liveCases = cases.data ?? [];
  const liveAppts = appts.data ?? [];
  const caseRows = liveCases.length > 0 ? liveCases : [...DEMO_CASES];
  const appointmentRows = liveAppts.length > 0 ? liveAppts : [...DEMO_APPOINTMENTS];

  const enableNotifications = async () => {
    const permission = await requestBrowserNotificationPermission();
    if (permission === "granted") toast.success("Browser notifications enabled");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="eyebrow text-brass">Client workspace</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Overview</h1>

      <div className="mt-8">
        <StatCardRow
          stats={[
            {
              label: "Open matters",
              value: caseRows.length,
              icon: <Briefcase className="h-4 w-4" />,
            },
            {
              label: "Appointments",
              value: appointmentRows.length,
              icon: <CalendarDays className="h-4 w-4" />,
            },
            {
              label: "Documents",
              value: (docs.data ?? []).length,
              icon: <FileText className="h-4 w-4" />,
            },
            {
              label: "Conversations",
              value: convos.data?.length ?? 0,
              icon: <Users className="h-4 w-4" />,
            },
          ]}
        />
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Notifications</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Real-time alerts for cases, messages, appointments and admin activity.
            </p>
          </div>
          {typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission !== "granted" && (
              <Button variant="outline" size="sm" onClick={() => void enableNotifications()}>
                Enable notifications
              </Button>
            )}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <PushRegistrationCard userId={user?.id} />
          <PwaInstallCard />
        </div>
        <div className="mt-4 space-y-3">
          {(notifications.data ?? []).length === 0 ? (
            <EmptyState
              title="No notifications yet"
              description="You’ll see live updates here as soon as activity arrives."
            />
          ) : (
            (notifications.data ?? []).slice(0, 5).map((n) => (
              <div key={n.id} className="rounded-lg border border-border bg-card p-5 shadow-plate">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display font-semibold">{n.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {n.body ?? "Open the workspace for details."}
                    </p>
                  </div>
                  <StatusPill value={n.read ? "resolved" : "pending"} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-xl font-semibold">Matters</h2>
          <div className="mt-4">
            <MattersList cases={caseRows} isLoading={cases.isLoading} />
          </div>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold">Upcoming appointments</h2>
          <div className="mt-4">
            <AppointmentsList appointments={appointmentRows} isLoading={appts.isLoading} />
          </div>
        </section>
        <section className="lg:col-span-2">
          <DocumentVault
            userId={user?.id}
            documents={docs.data ?? []}
            isLoading={docs.isLoading}
            allowDemoFallback
          />
        </section>
      </div>
    </div>
  );
}
