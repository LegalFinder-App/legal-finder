import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { AlertTriangle, Lock, Scale, Shield } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Button, Card, LoadingRows, Screen, Text } from "@/components/ui";
import { useAiConsent } from "@/lib/ai-consent";
import { CounsellorMark } from "@/components/CounsellorMark";

/**
 * Shows `children` once this account has agreed to its text being sent to the AI provider;
 * until then, the notice that asks. One yes covers both AI features (the notice names both), so
 * neither asks again after the other. See lib/ai-consent for why this exists.
 */
export function AiConsentGate({
  children,
  onDecline,
  fullScreen = false,
}: {
  children: ReactNode;
  /** "Not now" — leave the AI feature without agreeing. */
  onDecline: () => void;
  /** The notice is the whole screen (the assistant), not a part of one (drafting). */
  fullScreen?: boolean;
}) {
  const { colors } = useTheme();
  const consent = useAiConsent();
  const [saving, setSaving] = useState(false);

  if (consent.allowed) return <>{children}</>;
  const frame = (content: ReactNode) => (fullScreen ? <Screen>{content}</Screen> : content);
  if (consent.loading) return frame(<LoadingRows rows={3} />);

  const agree = async () => {
    setSaving(true);
    try {
      await consent.allow();
    } finally {
      setSaving(false);
    }
  };

  return frame(
    <Card>
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.brass + "22",
              borderWidth: 1,
              borderColor: colors.brass + "55",
            }}
          >
            <CounsellorMark size={26} color={colors.brass} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="caption" tone="brass">
              COUNSELLOR AI
            </Text>
            <Text variant="h3">Before you continue</Text>
          </View>
        </View>
        <Text>
          An advanced model helps with Uganda legal questions and document drafting. It can still
          get details wrong — treat answers as guidance, not a substitute for a verified advocate.
        </Text>
        <Point
          icon={<AlertTriangle size={16} color={colors.brass} />}
          title="May be incomplete or incorrect"
          body="Verify deadlines, arrests, money, or filings with a licensed advocate."
          colors={colors}
        />
        <Point
          icon={<Lock size={16} color={colors.brass} />}
          title="What you type generates the reply"
          body="Questions, drafts, and attachments go to our AI provider. Your name and email are not sent with them."
          colors={colors}
        />
        <Point
          icon={<Shield size={16} color={colors.brass} />}
          title="Chats stay on this device"
          body="History is keyed to your account here. Leave out ID numbers and secrets."
          colors={colors}
        />
        <Point
          icon={<Scale size={16} color={colors.brass} />}
          title="General information, not legal advice"
          body="No lawyer–client relationship is created by using Counsellor AI."
          colors={colors}
        />
        <View style={{ gap: 10, marginTop: 4 }}>
          <Button
            title="Allow and continue"
            loading={saving}
            onPress={() => void agree()}
            fullWidth
          />
          <Button title="Not now" variant="outline" onPress={onDecline} fullWidth />
        </View>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push("/legal/privacy")}
          hitSlop={8}
          style={{ alignSelf: "center" }}
        >
          <Text variant="small" tone="brass">
            Read the privacy policy
          </Text>
        </Pressable>
        <Text variant="caption" tone="muted" align="center">
          You can switch this off at any time in Settings.
        </Text>
      </View>
    </Card>,
  );
}

function Point({
  icon,
  title,
  body,
  colors,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  colors: { brass: string; border: string; card: string; [key: string]: string };
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 10,
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.brass + "18",
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="small" style={{ fontWeight: "600" }}>
          {title}
        </Text>
        <Text variant="caption" tone="muted">
          {body}
        </Text>
      </View>
    </View>
  );
}
