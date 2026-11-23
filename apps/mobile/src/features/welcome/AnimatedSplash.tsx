import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, gradients } from "@/theme/tokens";
import { Text } from "@/components/ui";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

type Props = {
  onFinished: () => void;
};

/**
 * Cold-start brand moment after the native splash hides: seal + wordmark on ink,
 * then a soft fade into onboarding or the app. Delight tier — rare / first paint.
 */
export function AnimatedSplash({ onFinished }: Props) {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const finished = useRef(onFinished);
  finished.current = onFinished;
  const done = () => finished.current();

  const sealOpacity = useSharedValue(reduced ? 1 : 0);
  const sealScale = useSharedValue(reduced ? 1 : 0.92);
  const markOpacity = useSharedValue(reduced ? 1 : 0);
  const markY = useSharedValue(reduced ? 0 : 12);
  const ruleScale = useSharedValue(reduced ? 1 : 0.2);
  const tagOpacity = useSharedValue(reduced ? 1 : 0);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      const t = setTimeout(done, 280);
      return () => clearTimeout(t);
    }

    sealOpacity.set(withTiming(1, { duration: 520, easing: EASE_OUT }));
    sealScale.set(withTiming(1, { duration: 620, easing: EASE_OUT }));
    markOpacity.set(withDelay(220, withTiming(1, { duration: 420, easing: EASE_OUT })));
    markY.set(withDelay(220, withTiming(0, { duration: 480, easing: EASE_OUT })));
    ruleScale.set(withDelay(380, withTiming(1, { duration: 420, easing: EASE_OUT })));
    tagOpacity.set(withDelay(520, withTiming(1, { duration: 360, easing: EASE_OUT })));

    screenOpacity.set(
      withDelay(
        1480,
        withTiming(0, { duration: 380, easing: EASE_OUT }, (ok) => {
          if (ok) scheduleOnRN(done);
        }),
      ),
    );
    // Mount-only entrance; shared values are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  const sealStyle = useAnimatedStyle(() => ({
    opacity: sealOpacity.get(),
    transform: [{ scale: sealScale.get() }],
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.get(),
    transform: [{ translateY: markY.get() }],
  }));
  const ruleStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: ruleScale.get() }],
  }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tagOpacity.get() }));
  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.get() }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, screenStyle]} pointerEvents="none">
      <LinearGradient
        colors={[...(scheme === "dark" ? gradients.inkDark : gradients.inkLight)]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.fill}
      >
        <View style={styles.glow} />
        <Animated.View style={[styles.sealRing, { borderColor: `${colors.brass}99` }, sealStyle]}>
          <Image
            source={require("../../../assets/splash-icon.png")}
            style={styles.seal}
            contentFit="contain"
            accessibilityLabel="LegalFinder seal"
          />
        </Animated.View>
        <Animated.View style={[styles.markBlock, markStyle]}>
          <Text style={styles.wordmark} accessibilityRole="header">
            <Text style={[styles.wordmark, { color: colors.inkForeground }]}>Legal</Text>
            <Text style={[styles.wordmark, { color: colors.brass }]}>Finder</Text>
          </Text>
          <Animated.View
            style={[styles.rule, { backgroundColor: colors.brass }, ruleStyle]}
          />
        </Animated.View>
        <Animated.View style={tagStyle}>
          <Text variant="eyebrow" tone="brass" align="center">
            Justice, within reach
          </Text>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  glow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(222, 166, 69, 0.12)",
  },
  sealRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    marginBottom: 28,
  },
  seal: { width: 88, height: 88 },
  markBlock: { alignItems: "center", marginBottom: 16 },
  wordmark: {
    fontFamily: fonts.displayBold,
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.8,
  },
  rule: { marginTop: 14, height: 2, width: 48, borderRadius: 1 },
});
