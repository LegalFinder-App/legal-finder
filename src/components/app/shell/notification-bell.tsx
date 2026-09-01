import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notificationsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notifications = useQuery(notificationsQuery(user?.id));

  const rows = useMemo(() => notifications.data ?? [], [notifications.data]);
  const unread = useMemo(() => rows.filter((n) => !n.read), [rows]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });

  const markAllRead = async () => {
    if (!user?.id || unread.length === 0) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    invalidate();
  };

  const openNotification = async (notification: (typeof rows)[number]) => {
    if (!notification.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", notification.id);
      invalidate();
    }
    if (notification.link) navigate({ to: notification.link });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unread.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brass px-1 text-[0.6rem] font-bold text-brass-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          {unread.length > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-1 text-xs font-medium text-brass hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              You're all caught up.
            </p>
          ) : (
            rows.slice(0, 12).map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => void openNotification(notification)}
                className={cn(
                  "block w-full border-b border-border/60 px-3 py-2.5 text-left last:border-b-0 hover:bg-accent/60",
                  !notification.read && "bg-brass/5",
                )}
              >
                <div className="flex items-start gap-2">
                  {!notification.read && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{notification.title}</p>
                    {notification.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {notification.body}
                      </p>
                    )}
                    <p className="mt-1 text-[0.65rem] text-muted-foreground/70">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
