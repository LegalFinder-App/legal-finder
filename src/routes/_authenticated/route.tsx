import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useSession, ROLE_LABELS, type AppRole } from "@/lib/session";
import {
  requestBrowserNotificationPermission,
  registerAppServiceWorker,
  showBrowserNotification,
} from "@/lib/platform-notifications";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: WorkspaceLayout,
});

const ALL_LINKS = [
  { to: "/dashboard", label: "Overview", roles: ["user", "lawyer", "police", "judiciary", "admin"] as AppRole[] },
  { to: "/messages", label: "Messages", roles: ["user", "lawyer", "police", "judiciary", "admin"] as AppRole[] },
  { to: "/assistant", label: "Assistant", roles: ["user", "lawyer", "police", "judiciary", "admin"] as AppRole[] },
  { to: "/practice", label: "Practice", roles: ["lawyer", "admin"] as AppRole[] },
  { to: "/precinct", label: "Precinct", roles: ["police", "admin"] as AppRole[] },
  { to: "/bench", label: "Bench", roles: ["judiciary", "admin"] as AppRole[] },
  { to: "/admin", label: "Admin", roles: ["admin"] as AppRole[] },
] as const;

function linksForRole(role: AppRole) {
  return ALL_LINKS.filter((link) => link.roles.includes(role));
}

function WorkspaceLayout() {
  const { primaryRole, user, roles } = useSession();
  const navLinks = linksForRole(primaryRole);
  const navigate = useNavigate();
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

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const enableNotifications = async () => {
    const permission = await requestBrowserNotificationPermission();
    if (permission === "granted") {
      toast.success("Browser notifications enabled");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="surface-ink">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-ink-foreground">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-md px-3 py-2 text-sm text-ink-foreground/70 hover:bg-ink-foreground/10 hover:text-ink-foreground"
                activeProps={{ className: "text-brass bg-ink-foreground/10" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-ink-foreground/60 sm:block">
              {ROLE_LABELS[primaryRole]}
              {roles.length > 1 ? ` · ${roles.length} roles` : ""} · {user?.email}
            </span>
            {typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission !== "granted" && (
                <Button variant="outlineInk" size="sm" onClick={enableNotifications}>
                  Enable notifications
                </Button>
              )}
            <Button variant="outlineInk" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
