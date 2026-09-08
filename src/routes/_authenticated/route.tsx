import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/shell/app-shell";
import { useSession } from "@/lib/session";
import { registerAppServiceWorker, showBrowserNotification } from "@/lib/platform-notifications";
import { checkClerkSession } from "@/lib/clerk-session.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { userId } = await checkClerkSession();
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
      <Outlet />
    </AppShell>
  );
}
