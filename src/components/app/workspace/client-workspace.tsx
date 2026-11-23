import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Briefcase, CalendarDays, FileText, MessageSquare, Scale, Sparkles } from "lucide-react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { EmptyState, StatusPill } from "@/components/common/bits";
import {
  MetricTile,
  WorkspaceFrame,
  WorkspaceHeader,
  WorkspacePanel,
} from "@/components/app/shell/workspace-chrome";
import { MattersList } from "./shared/matters-list";
import { AppointmentsList } from "./shared/appointments-list";
import { DocumentVault } from "./shared/document-vault";
import { PushRegistrationCard } from "./shared/push-registration-card";
import { PwaInstallCard } from "./shared/pwa-install-card";
import { LiveCourtroomPanel } from "@/components/app/live-courtroom-panel";
import { useSession } from "@/lib/session";
import {
  myCasesQuery,
  appointmentsQuery,
  documentsQuery,
  conversationsQuery,
  notificationsQuery,
} from "@/lib/queries";
import { requestBrowserNotificationPermission } from "@/lib/platform-notifications";

export function ClientWorkspace() {
  const { user } = useSession();
  const navigate = useNavigate();
  const searchStr = useRouterState({ select: (state) => state.location.searchStr });
  const cases = useQuery(myCasesQuery(user?.id));
  const appts = useQuery(appointmentsQuery(user?.id));
  const docs = useQuery(documentsQuery(user?.id));
  const convos = useQuery(conversationsQuery(user?.id));
  const notifications = useQuery(notificationsQuery(user?.id));

  useEffect(() => {
    const params = new URLSearchParams(searchStr);
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
  }, [searchStr, navigate]);

  const caseRows = cases.data ?? [];
  const appointmentRows = appts.data ?? [];
  const firstName = user?.fullName?.split(" ")[0];

  const enableNotifications = async () => {
    const permission = await requestBrowserNotificationPermission();
    if (permission === "granted") toast.success("Browser notifications enabled");
  };

  return (
    <WorkspaceFrame className="pb-14">
      <WorkspaceHeader
        eyebrow="Client workspace"
        title={firstName ? `Welcome back, ${firstName}` : "Your overview"}
        description="Matters, hearings, documents and messages — one place to follow your legal work in Uganda."
        action={
          <>
            <Button asChild variant="outline" size="sm" className="rounded-xl">
              <Link to="/messages">
                <MessageSquare className="h-3.5 w-3.5" />
                Messages
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-xl">
              <Link to="/assistant">
                <Sparkles className="h-3.5 w-3.5" />
                Ask Counsellor
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Open matters"
          value={caseRows.length}
          icon={<Briefcase className="h-4 w-4" />}
        />
        <MetricTile
          label="Appointments"
          value={appointmentRows.length}
          icon={<CalendarDays className="h-4 w-4" />}
        />
        <MetricTile
          label="Documents"
          value={(docs.data ?? []).length}
          icon={<FileText className="h-4 w-4" />}
        />
        <MetricTile
          label="Conversations"
          value={convos.data?.length ?? 0}
          icon={<MessageSquare className="h-4 w-4" />}
        />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-5">
        <WorkspacePanel
          eyebrow="Stay informed"
          title="Notifications"
          description="Cases, messages, appointments and admin activity."
          className="lg:col-span-3"
          action={
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission !== "granted" ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => void enableNotifications()}
              >
                Enable alerts
              </Button>
            ) : undefined
          }
        >
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <PushRegistrationCard userId={user?.id} />
            <PwaInstallCard />
          </div>
          {(notifications.data ?? []).length === 0 ? (
            <EmptyState
              title="No notifications yet"
              description="You’ll see live updates here as soon as activity arrives."
            />
          ) : (
            <ul className="space-y-2.5">
              {(notifications.data ?? []).slice(0, 5).map((n) => (
                <li
                  key={n.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-secondary/20 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold">{n.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {n.body ?? "Open the workspace for details."}
                    </p>
                  </div>
                  <StatusPill value={n.read ? "resolved" : "pending"} />
                </li>
              ))}
            </ul>
          )}
        </WorkspacePanel>

        <WorkspacePanel eyebrow="Quick start" title="Trusted next steps" className="lg:col-span-2">
          <ul className="space-y-2">
            <li>
              <Link
                to="/lawyers"
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 px-3.5 py-3 transition-colors hover:border-brass/35 hover:bg-secondary/40"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-brass">
                  <Scale className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Find a verified advocate</span>
                  <span className="text-xs text-muted-foreground">Browse the directory</span>
                </span>
              </Link>
            </li>
            <li>
              <Link
                to="/assistant"
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 px-3.5 py-3 transition-colors hover:border-brass/35 hover:bg-secondary/40"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-brass">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Ask Counsellor AI</span>
                  <span className="text-xs text-muted-foreground">Plain-language guidance</span>
                </span>
              </Link>
            </li>
            <li>
              <Link
                to="/messages"
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 px-3.5 py-3 transition-colors hover:border-brass/35 hover:bg-secondary/40"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-brass">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Open messages</span>
                  <span className="text-xs text-muted-foreground">Talk to your advocate</span>
                </span>
              </Link>
            </li>
          </ul>
        </WorkspacePanel>
      </div>

      <div className="mt-8">
        <LiveCourtroomPanel title="Your live hearings" />
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <WorkspacePanel eyebrow="Caseload" title="Matters">
          {caseRows.length === 0 && !cases.isLoading ? (
            <EmptyState
              title="No matters yet"
              description="Book a verified advocate or ask Counsellor AI to get oriented."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild size="sm" className="rounded-xl">
                    <Link to="/lawyers">Find an advocate</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="rounded-xl">
                    <Link to="/assistant">Ask Counsellor</Link>
                  </Button>
                </div>
              }
            />
          ) : (
            <MattersList cases={caseRows} isLoading={cases.isLoading} />
          )}
        </WorkspacePanel>
        <WorkspacePanel eyebrow="Schedule" title="Upcoming appointments">
          {appointmentRows.length === 0 && !appts.isLoading ? (
            <EmptyState
              title="No appointments yet"
              description="When you book a consultation, it will show up here."
              action={
                <Button asChild size="sm" className="rounded-xl">
                  <Link to="/lawyers">Browse advocates</Link>
                </Button>
              }
            />
          ) : (
            <AppointmentsList appointments={appointmentRows} isLoading={appts.isLoading} />
          )}
        </WorkspacePanel>
        <div className="lg:col-span-2">
          <DocumentVault
            userId={user?.id}
            documents={docs.data ?? []}
            isLoading={docs.isLoading}
            allowDemoFallback={false}
          />
        </div>
      </div>
    </WorkspaceFrame>
  );
}
