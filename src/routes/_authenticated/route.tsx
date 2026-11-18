import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/shell/app-shell";
import { MaintenanceGate } from "@/components/site/maintenance-gate";
import { useSession } from "@/lib/session";
import { registerAppServiceWorker, showBrowserNotification } from "@/lib/platform-notifications";
import { checkClerkSession } from "@/lib/clerk-session.functions";
import { clientClerkUserId } from "@/lib/after-auth";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Prefer the server cookie (also provisions the profile). If the cookie is still catching up
 * after finalize(), fall back to the browser Clerk session so a signed-in user is not bounced
 * to /auth — client data calls already use window.Clerk.session.getToken().
 */
async function resolveUserId(): Promise<string | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { userId } = await checkClerkSession();
      if (userId) return userId;
    } catch {
      // first-touch provisioning can flake once
    }
    const clientId = clientClerkUserId();
    if (clientId) {
      // Keep trying to provision / sync the cookie without blocking entry.
      void checkClerkSession().catch(() => {});
      return clientId;
    }
    await sleep(150 + attempt * 100);
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

  useEffect(() => {
    if (!user?.id) return;

    void registerAppServiceWorker();

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
