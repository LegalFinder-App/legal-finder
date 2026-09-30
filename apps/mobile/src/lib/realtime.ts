import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/expo";
import { supabase } from "./supabase";
import { toast } from "./toast";

export const unreadMessagesQuery = (userId: string | undefined) => ({
  queryKey: ["unread-messages", userId] as const,
  enabled: Boolean(userId),
  queryFn: async () => {
    // RLS already limits messages to the caller's own conversations.
    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .is("read_at", null)
      .neq("sender_id", userId!);
    if (error) throw new Error(error.message);
    return count ?? 0;
  },
});

export function useUnreadCount(): number {
  const { userId, isSignedIn } = useAuth();
  const { data } = useQuery(unreadMessagesQuery(isSignedIn ? (userId ?? undefined) : undefined));
  return data ?? 0;
}

/**
 * The web's _authenticated layout subscription, app-wide: new notifications and messages refresh
 * their lists immediately and surface an in-app toast (push notifications cover the background).
 */
export function useRealtimeSync() {
  const { userId, isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSignedIn || !userId) return;

    const channel = supabase
      .channel(`mobile-live-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as { user_id?: string; title?: string; body?: string };
          if (n.user_id !== userId) return;
          queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
          toast.message(n.title ?? "New notification", { description: n.body ?? undefined });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as { sender_id?: string; conversation_id?: string };
          queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
          queryClient.invalidateQueries({ queryKey: ["messages", m.conversation_id] });
          if (m.sender_id !== userId)
            queryClient.invalidateQueries({ queryKey: ["unread-messages", userId] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isSignedIn, userId, queryClient]);
}
