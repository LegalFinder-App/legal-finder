import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { BadgeCheck, MapPin } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Avatar, Card, Stars, Tag, Text } from "@/components/ui";
import { formatUGX } from "@/lib/format";
import type { Lawyer } from "@/lib/queries";

export function LawyerCard({ lawyer, compact = false }: { lawyer: Lawyer; compact?: boolean }) {
  const { colors } = useTheme();
  const location = [lawyer.city, lawyer.county].filter(Boolean).join(", ");

  return (
    <Card
      onPress={() => router.push(`/lawyers/${lawyer.id}`)}
      accessibilityLabel={`${lawyer.full_name}, ${lawyer.headline ?? "advocate"}`}
      style={compact ? { width: 260 } : undefined}
    >
      <View style={styles.top}>
        <Avatar name={lawyer.full_name} uri={lawyer.photo_url} size={52} />
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text variant="h3" numberOfLines={1} style={{ flexShrink: 1 }}>
              {lawyer.full_name}
            </Text>
            {lawyer.verified ? (
              <BadgeCheck size={16} color={colors.brass} accessibilityLabel="Verified" />
            ) : null}
          </View>
          {lawyer.headline ? (
            <Text variant="small" tone="muted" numberOfLines={1}>
              {lawyer.headline}
            </Text>
          ) : null}
          <View style={styles.ratingRow}>
            <Stars value={Number(lawyer.rating) || 0} size={12} />
            <Text variant="caption" tone="muted">
              {(Number(lawyer.rating) || 0).toFixed(1)} · {lawyer.review_count} reviews
            </Text>
          </View>
        </View>
      </View>

      {(lawyer.practice_areas ?? []).length > 0 ? (
        <View style={styles.tags}>
          {(lawyer.practice_areas ?? []).slice(0, compact ? 2 : 3).map((area) => (
            <Tag key={area} label={area} />
          ))}
        </View>
      ) : null}

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.loc}>
          <MapPin size={13} color={colors.mutedForeground} />
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {location || "Uganda"}
          </Text>
        </View>
        <Text variant="mono" tone="muted">
          {lawyer.consultation_fee ? formatUGX(Number(lawyer.consultation_fee)) : "Fee on request"}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", gap: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  footer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  loc: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
});
