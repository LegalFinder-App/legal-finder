import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Button, Card, LoadingRows, Screen, Text } from "@/components/ui";
import { useAiConsent } from "@/lib/ai-consent";

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
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Sparkles size={20} color={colors.brass} />
          <Text variant="h3" style={{ flex: 1 }}>
            Before you use AI features
          </Text>
        </View>
        <Text>
          The legal assistant and AI-assisted document drafting are powered by Claude, an AI model
          made by Anthropic. What you type into them — your questions, your drafting instructions
          and the draft you are revising — is sent to Anthropic to write the response.
        </Text>
        <Text>
          Your name, email and account details are not sent with it, and LegalFinder does not keep
          your conversation with the assistant. Leave out names, ID numbers and anything else you
          would not want shared.
        </Text>
        <Text tone="muted">
          Answers and drafts are general information, not legal advice. For anything that matters,
          ask a verified advocate.
        </Text>
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
