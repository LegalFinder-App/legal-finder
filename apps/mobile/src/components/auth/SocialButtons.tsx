import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
// Lucide v1 dropped brand logos, so the Apple/LinkedIn marks come from Expo's bundled icon fonts.
// Imported by file so only this one font ships, not every icon set in the package.
import AntDesign from "@expo/vector-icons/AntDesign";
import { useTheme } from "@/theme/ThemeProvider";
import { Button, Text } from "@/components/ui";
import {
  cancelSocialSignIn,
  useSocialSignIn,
  type SocialStrategy as Strategy,
} from "@/lib/social-sign-in";
import { errorMessage, toast } from "@/lib/toast";

function GoogleMark() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.3 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <Path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <Path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
      />
    </Svg>
  );
}

/**
 * Google / Apple / LinkedIn (see lib/social-sign-in). Calls onSecondFactor when the account has
 * MFA enrolled — the caller shows the code step.
 */
export function SocialButtons({
  onSecondFactor,
  onDone,
}: {
  onSecondFactor: () => void;
  onDone: () => void;
}) {
  const { colors } = useTheme();
  const startSocialSignIn = useSocialSignIn();
  const [busy, setBusy] = useState<Strategy | null>(null);

  const start = async (strategy: Strategy) => {
    setBusy(strategy);
    try {
      const result = await startSocialSignIn(strategy);
      if (result === "signed-in") onDone();
      else if (result === "needs-second-factor") onSecondFactor();
      // "cancelled": the user closed the browser — nothing to report.
    } catch (error) {
      toast.error(errorMessage(error, "Sign-in didn't complete"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <Text variant="small" tone="muted">
          or continue with
        </Text>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>
      <Button
        title="Google"
        variant="outline"
        icon={<GoogleMark />}
        loading={busy === "oauth_google"}
        disabled={busy !== null}
        onPress={() => void start("oauth_google")}
        fullWidth
      />
      <Button
        title="Apple"
        variant="outline"
        icon={<AntDesign name="apple" size={16} color={colors.foreground} />}
        loading={busy === "oauth_apple"}
        disabled={busy !== null}
        onPress={() => void start("oauth_apple")}
        fullWidth
      />
      <Button
        title="LinkedIn"
        variant="outline"
        icon={<AntDesign name="linkedin" size={16} color="#0A66C2" />}
        loading={busy === "oauth_linkedin_oidc"}
        disabled={busy !== null}
        onPress={() => void start("oauth_linkedin_oidc")}
        fullWidth
      />
      {busy && cancelSocialSignIn ? (
        <View style={styles.waiting}>
          <Text variant="small" tone="muted">
            Finish signing in in your browser, then come back here.
          </Text>
          <Pressable accessibilityRole="button" onPress={cancelSocialSignIn} hitSlop={8}>
            <Text variant="small" tone="brass">
              Cancel
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 6 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  waiting: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
});
