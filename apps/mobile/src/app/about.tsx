import { Linking, View } from "react-native";
import { Stack } from "expo-router";
import Constants from "expo-constants";
import { Mail } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Button, Card, PageHeading, Screen, Text } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { openLink } from "@/components/Markdown";

const SOURCES = [
  { label: "Judiciary of Uganda", url: "https://judiciary.go.ug/" },
  { label: "Uganda Legal Information Institute (ULII)", url: "https://ulii.org/" },
  { label: "Uganda Police Force", url: "https://upf.go.ug/" },
];

export default function AboutScreen() {
  const { colors } = useTheme();
  return (
    <Screen>
      <Stack.Screen options={{ title: "About" }} />
      <Logo />
      <PageHeading
        eyebrow="Our mission"
        title="Access to justice should not depend on who you know"
      />
      <Text style={{ lineHeight: 23 }}>
        LegalFinder shortens the distance between a person with a legal problem and the professional
        who can solve it. Advocates are checked against the roll before publication, reviews come
        from real clients, and every matter carries a reference you can follow from filing to
        judgement.
      </Text>
      <Card>
        <Text variant="bodyStrong">Sources for government information</Text>
        <Text variant="small" tone="muted" style={{ marginTop: 4, marginBottom: 8 }}>
          Court judgements and advocate-roll verification can be independently checked at:
        </Text>
        {SOURCES.map((s) => (
          <Text
            key={s.url}
            variant="small"
            tone="brass"
            accessibilityRole="link"
            onPress={() => openLink(s.url)}
            style={{ paddingVertical: 4 }}
          >
            {s.label}
          </Text>
        ))}
      </Card>
      <Text variant="small" tone="muted">
        LegalFinder is an independent, privately operated platform. It is not a government entity
        and is not affiliated with, endorsed by, or operated on behalf of the Government of Uganda,
        the Judiciary of Uganda, the Uganda Police Force, or any other government body. Information
        here is general guidance, not a substitute for advice from a qualified advocate.
      </Text>
      <Button
        title="Contact support"
        variant="outline"
        icon={<Mail size={16} color={colors.foreground} />}
        onPress={() => void Linking.openURL("mailto:support@legalfinder.co")}
      />
      <View style={{ alignItems: "center", marginTop: 8 }}>
        <Text variant="caption" tone="muted">
          Version {Constants.expoConfig?.version ?? "—"}
        </Text>
      </View>
    </Screen>
  );
}
