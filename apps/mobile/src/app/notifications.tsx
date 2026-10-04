import { FlatList, View } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useWideLayout, wideContent } from "@/lib/layout";
import { Button, EmptyState, ErrorState, LoadingRows } from "@/components/ui";
import { RequireAuth } from "@/components/RequireAuth";
import { NotificationItem } from "@/features/shared/Items";
import { useSession } from "@/lib/session";
import { notificationsQuery, type NotificationRow } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

/** Maps a web link on a notification to its in-app screen (never an external site). */
function routeFor(link: string | null): string | null {
  if (!link) return null;
  const path = link.replace(/^https?:\/\/(www\.)?legalfinder\.co/, "");
  if (!path.startsWith("/")) return null;
  if (["/dashboard", "/practice", "/precinct", "/bench", "/admin"].includes(path)) return "/";
  // The app's administration lives on its home tab; the web's /admin/* pages are its tabs there.
  if (path === "/admin/reports") return "/?tab=reports";
  if (path.startsWith("/admin/")) return "/";
  return path;
}

function Notifications() {
  const { colors } = useTheme();
  const wide = useWideLayout();
  const { user } = useSession();
  const qc = useQueryClient();
  const notes = useQuery(notificationsQuery(user?.id));
  const unread = (notes.data ?? []).filter((n) => !n.read);

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    const { error } = await supabase.from("notifications").update({ read: true }).in("id", ids);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  const open = (n: NotificationRow) => {
    if (!n.read) void markRead([n.id]);
    const route = routeFor(n.link);
    if (route) router.push(route as never);
  };

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[{ padding: 20, paddingBottom: 48 }, wide && wideContent]}
      data={notes.isLoading || notes.isError ? [] : (notes.data ?? [])}
      keyExtractor={(n) => n.id}
      refreshing={notes.isRefetching}
      onRefresh={() => void notes.refetch()}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      ListHeaderComponent={
        unread.length > 0 ? (
          <Button
            title={`Mark all ${unread.length} as read`}
            variant="ghost"
            size="sm"
            icon={<CheckCheck size={16} color={colors.brass} />}
            onPress={() => void markRead(unread.map((n) => n.id))}
            style={{ alignSelf: "flex-end", marginBottom: 8 }}
          />
        ) : null
      }
      renderItem={({ item }) => <NotificationItem notification={item} onPress={() => open(item)} />}
      ListEmptyComponent={
        notes.isLoading ? (
          <LoadingRows rows={5} />
        ) : notes.isError ? (
          <ErrorState
            message={(notes.error as Error).message}
            onRetry={() => void notes.refetch()}
          />
        ) : (
          <EmptyState
            icon={<Bell size={22} color={colors.brass} />}
            title="You're all caught up"
            description="Updates about your cases, messages and appointments appear here."
          />
        )
      }
    />
  );
}

export default function NotificationsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Notifications" }} />
      <RequireAuth>
        <Notifications />
      </RequireAuth>
    </>
  );
}
