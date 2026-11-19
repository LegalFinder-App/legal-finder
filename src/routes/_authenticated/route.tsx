import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/tanstack-react-start";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/shell/app-shell";
import { MaintenanceGate } from "@/components/site/maintenance-gate";
import { useSession } from "@/lib/session";
import { registerAppServiceWorker, showBrowserNotification } from "@/lib/platform-notifications";
import { checkClerkSession } from "@/lib/clerk-session.functions";
import { clientClerkUserId } from "@/lib/after-auth";
import { startSessionWatchdog } from "@/lib/session-watchdog";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * On a hard refresh, Clerk JS boots a moment after the first beforeLoad. Returning null too
 * early was bouncing signed-in people to /auth "at random". Wait for Clerk, then the cookie
 * check, before giving up.
 */
async function resolveUserId(): Promise<string | null> {
  if (typeof window !== "undefined") {
    const deadline = Date.now() + 8_000;
    while (Date.now() < deadline) {
      const clerk = window.Clerk;
      if (clerk && !clerk.loaded) {
        await clerk.load().catch(() => undefined);
      }
      if (clerk?.loaded) {
        const id = clerk.user?.id ?? clerk.session?.user?.id ?? null;
        if (id) {
          void checkClerkSession().catch(() => {});
          return id;
        }
        // Clerk finished loading with no user — fall through to the server cookie check.
        break;
      }
      await sleep(50);
    }
  }

  const immediate = clientClerkUserId();
  if (immediate) {
    void checkClerkSession().catch(() => {});
    return immediate;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { userId } = await checkClerkSession();
      if (userId) return userId;
    } catch {
      // provisioning / transport blip
    }
    await sleep(150 + attempt * 100);
    const again = clientClerkUserId();
    if (again) return again;
  }

  return clientClerkUserId();
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const userId = await resolveUserId();
    if (!userId) throw redirect({ to: "/auth" });
    return { user: { id: userId } };
  },
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;
    return startSessionWatchdog({
      userId: user.id,
      signOut: () => signOut(),
      navigateToAuth: () => navigate({ to: "/auth", replace: true }),
    });
  }, [navigate, signOut, user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    void registerAppServiceWorker();
    void checkClerkSession().catch(() => {});

    const channel = supabase
      .channel(`workspace-live-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        async (payload) => {
          const notification = payload.new as {
            user_id?: string;
            title?: string;
            body?: string;
            link?: string;
          };
          if (notification.user_id !== user.id) return;
          await showBrowserNotification(notification.title ?? "LegalFinder update", {
            body: notification.body ?? "You have a new notification.",
            url: notification.link ?? "/dashboard",
            kind: "notification",
          });
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
          toast.message(notification.title ?? "New notification", {
            description: notification.body ?? undefined,
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const message = payload.new as {
            sender_id?: string;
            sender_name?: string;
            body?: string;
            conversation_id?: string;
          };
          queryClient.invalidateQueries({ queryKey: ["conversations", user.id] });
          queryClient.invalidateQueries({ queryKey: ["messages"] });
          if (message.sender_id === user.id) return;
          toast.message(message.sender_name ?? "New message", {
            description: message.body ?? "You received a new message.",
          });
          await showBrowserNotification(message.sender_name ?? "New message", {
            body: message.body ?? "You received a new message.",
            url: "/messages",
            kind: "message",
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  return (
    <AppShell>
      <MaintenanceGate>
        <Outlet />
      </MaintenanceGate>
    </AppShell>
  );
}
