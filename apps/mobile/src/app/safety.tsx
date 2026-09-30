import { Linking, View } from "react-native";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Phone, ShieldCheck } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingRows,
  PageHeading,
  Screen,
  Text,
} from "@/components/ui";
import { securityTipsQuery } from "@/lib/queries";

export default function SafetyScreen() {
  const { colors } = useTheme();
  const tips = useQuery(securityTipsQuery);
  return (
    <Screen refreshing={tips.isRefetching} onRefresh={() => void tips.refetch()}>
      <Stack.Screen options={{ title: "Safety & security" }} />
      <PageHeading
        eyebrow="Stay safe"
        title="Safety & security"
        description="Practical guidance from police and legal professionals."
      />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button
          title="Emergency 999"
          variant="destructive"
          icon={<Phone size={16} color={colors.destructiveForeground} />}
          onPress={() => void Linking.openURL("tel:999")}
          style={{ flex: 1 }}
        />
        <Button
          title="Report"
          variant="outline"
          onPress={() => router.push("/report")}
          style={{ flex: 1 }}
        />
      </View>
      {tips.isLoading ? (
        <LoadingRows rows={4} />
      ) : tips.isError ? (
        <ErrorState message={(tips.error as Error).message} onRetry={() => void tips.refetch()} />
      ) : (tips.data ?? []).length === 0 ? (
        <EmptyState title="No tips published yet" />
      ) : (
        (tips.data ?? []).map((t) => (
          <Card key={t.id}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <ShieldCheck size={20} color={colors.brass} />
              <View style={{ flex: 1 }}>
                <Text variant="h3">{t.title}</Text>
                <Text style={{ marginTop: 6, lineHeight: 22 }}>{t.body}</Text>
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}
