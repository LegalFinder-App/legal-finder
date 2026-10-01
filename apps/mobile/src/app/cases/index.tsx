import { useState } from "react";
import { FlatList, View } from "react-native";
import { Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useWideLayout, wideContent } from "@/lib/layout";
import { ChipRow, EmptyState, ErrorState, LoadingRows, Text } from "@/components/ui";
import { RequireAuth } from "@/components/RequireAuth";
import { MatterItem } from "@/features/shared/Items";
import { useSession } from "@/lib/session";
import { myCasesQuery } from "@/lib/queries";

type Filter = "all" | "open" | "hearing" | "closed";

function Cases() {
  const { colors } = useTheme();
  const wide = useWideLayout();
  const { user } = useSession();
  const cases = useQuery(myCasesQuery(user?.id));
  const [filter, setFilter] = useState<Filter>("all");
  const rows = (cases.data ?? []).filter((c) => filter === "all" || c.status === filter);

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[{ padding: 20, paddingBottom: 48 }, wide && wideContent]}
      data={cases.isLoading || cases.isError ? [] : rows}
      keyExtractor={(c) => c.id}
      refreshing={cases.isRefetching}
      onRefresh={() => void cases.refetch()}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 16 }}>
          <Text variant="small" tone="muted">
            Follow every matter from filing to judgement with hearing dates, notes and shared
            documents.
          </Text>
          <ChipRow
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "open", label: "Open" },
              { value: "hearing", label: "Hearing" },
              { value: "closed", label: "Closed" },
            ]}
          />
        </View>
      }
      renderItem={({ item }) => <MatterItem matter={item} />}
      ListEmptyComponent={
        cases.isLoading ? (
          <LoadingRows rows={4} />
        ) : cases.isError ? (
          <ErrorState
            message={(cases.error as Error).message}
            onRetry={() => void cases.refetch()}
          />
        ) : (
          <EmptyState
            icon={<ScrollText size={22} color={colors.brass} />}
            title={filter === "all" ? "No matters yet" : `No ${filter} matters`}
            description="Matters opened by your advocate appear here automatically."
          />
        )
      }
    />
  );
}

export default function CasesScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Matters" }} />
      <RequireAuth>
        <Cases />
      </RequireAuth>
    </>
  );
}
