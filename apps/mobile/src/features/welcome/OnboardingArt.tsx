import { StyleSheet, View, type ViewStyle } from "react-native";
import { Gavel, Library, Scale, ShieldCheck, Sparkles, Users } from "lucide-react-native";
import type { ComponentType, ReactNode } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/tokens";
import { Text } from "@/components/ui";

type Icon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type FloatingCard = {
  icon: Icon;
  label: string;
  meta?: string;
  accent?: boolean;
};

/** Soft “product mock” compositions — structural cousins of the reference decks, LegalFinder ink/brass. */
export function AdvocatesArt() {
  const { colors } = useTheme();
  return (
    <ArtStage>
      <FloatCard
        icon={Scale}
        label="Verified advocates"
        meta="Uganda Law Council"
        accent
        style={{ top: 18, left: 24, width: "72%" }}
      />
      <AvatarCluster
        style={{ top: 108, right: 28 }}
        colors={[colors.brass, colors.ink, colors.gold]}
      />
      <FloatCard
        icon={Users}
        label="Book a consultation"
        meta="From UGX 50,000"
        style={{ bottom: 28, left: 36, width: "66%" }}
      />
    </ArtStage>
  );
}

export function CasesArt() {
  const { colors } = useTheme();
  return (
    <ArtStage>
      <View
        style={[
          styles.timeline,
          {
            borderColor: `${colors.brass}40`,
            backgroundColor: colors.card,
          },
        ]}
      >
        <TimelineRow title="Hearing · High Court" when="Tomorrow 09:00" done />
        <TimelineRow title="File note · Motions" when="Today" />
        <TimelineRow title="Judgement search" when="Saved" muted />
      </View>
      <View style={[styles.badge, { backgroundColor: colors.ink, top: 16, right: 20 }]}>
        <Gavel size={14} color={colors.brass} strokeWidth={2.2} />
        <Text variant="caption" style={{ color: colors.inkForeground, marginLeft: 6 }}>
          Courts
        </Text>
      </View>
    </ArtStage>
  );
}

export function CounsellorArt() {
  const { colors } = useTheme();
  return (
    <ArtStage>
      <View style={[styles.chatBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Sparkles size={16} color={colors.brass} strokeWidth={2.2} />
        <Text variant="small" style={{ flex: 1, marginLeft: 10 }}>
          What should I bring to my first hearing?
        </Text>
      </View>
      <View
        style={[
          styles.chatBubble,
          styles.reply,
          { backgroundColor: colors.ink, borderColor: "transparent" },
        ]}
      >
        <Library size={16} color={colors.brass} strokeWidth={2.2} />
        <Text variant="small" style={{ flex: 1, marginLeft: 10, color: colors.inkForeground }}>
          Plain-language steps, statutes and next actions — in minutes.
        </Text>
      </View>
      <View
        style={[
          styles.shield,
          { borderColor: `${colors.brass}66`, backgroundColor: colors.card },
        ]}
      >
        <ShieldCheck size={22} color={colors.brass} strokeWidth={2} />
      </View>
    </ArtStage>
  );
}

function ArtStage({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.stage, { backgroundColor: `${colors.accent}99` }]}>
      <View style={[styles.orb, { backgroundColor: `${colors.brass}22` }]} />
      {children}
    </View>
  );
}

function FloatCard({
  icon: Icon,
  label,
  meta,
  accent,
  style,
}: FloatingCard & { style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.floatCard,
        {
          backgroundColor: colors.card,
          borderColor: accent ? `${colors.brass}55` : colors.border,
          shadowColor: colors.ink,
        },
        style,
      ]}
    >
      <View style={[styles.iconTile, { backgroundColor: colors.accent }]}>
        <Icon size={16} color={colors.brass} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        {meta ? (
          <Text variant="caption" tone="muted">
            {meta}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function AvatarCluster({
  colors: dots,
  style,
}: {
  colors: string[];
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.avatars, style]}>
      {dots.map((c, i) => (
        <View
          key={i}
          style={[
            styles.avatar,
            { backgroundColor: c, marginLeft: i === 0 ? 0 : -10, zIndex: dots.length - i },
          ]}
        />
      ))}
    </View>
  );
}

function TimelineRow({
  title,
  when,
  done,
  muted,
}: {
  title: string;
  when: string;
  done?: boolean;
  muted?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.timelineRow}>
      <View
        style={[
          styles.dot,
          {
            backgroundColor: done ? colors.brass : muted ? colors.border : colors.ink,
          },
        ]}
      />
      <View style={{ flex: 1 }}>
        <Text variant="small" style={{ opacity: muted ? 0.7 : 1 }}>
          {title}
        </Text>
        <Text variant="caption" tone="muted">
          {when}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: "100%",
    aspectRatio: 1.05,
    maxHeight: 340,
    borderRadius: radius["2xl"],
    overflow: "hidden",
    position: "relative",
  },
  orb: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -40,
    alignSelf: "center",
    left: "18%",
  },
  floatCard: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  avatars: { position: "absolute", flexDirection: "row" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
  },
  timeline: {
    margin: 28,
    marginTop: 48,
    padding: 16,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: 14,
  },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  badge: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  chatBubble: {
    marginHorizontal: 24,
    marginTop: 36,
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
  },
  reply: { marginTop: 12, marginLeft: 40 },
  shield: {
    position: "absolute",
    bottom: 28,
    right: 28,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});

