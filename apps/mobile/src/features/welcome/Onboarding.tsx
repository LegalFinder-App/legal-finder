import { useCallback, useRef, useState, type ReactElement } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ListViewToken,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ChevronRight } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdvocatesArt, CasesArt, CounsellorArt } from "./OnboardingArt";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius } from "@/theme/tokens";
import { Button, Text } from "@/components/ui";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

type Slide = {
  key: string;
  title: string;
  body: string;
  Art: () => ReactElement;
};

const SLIDES: Slide[] = [
  {
    key: "advocates",
    title: "Verified advocates, ready when you are",
    body: "Find counsel checked against the Uganda Law Council roll — then message or book with confidence.",
    Art: AdvocatesArt,
  },
  {
    key: "cases",
    title: "Your matters and the courts, together",
    body: "Track hearings, notes and documents. Search judgements by court, judge or case number.",
    Art: CasesArt,
  },
  {
    key: "counsellor",
    title: "Clear next steps in plain language",
    body: "Counsellor AI, the e-library and incident reporting — justice tools that stay within reach.",
    Art: CounsellorArt,
  },
];

type Props = {
  onComplete: () => void;
};

export function Onboarding({ onComplete }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  // On desktop/web (HP/Dell monitors) keep a phone-width column so slides don't stretch edge-to-edge.
  const width = Math.min(windowWidth, 480);
  const reduced = useReducedMotion();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const progress = useSharedValue(0);

  const finish = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
  }, [onComplete]);

  const goNext = useCallback(() => {
    if (index >= SLIDES.length - 1) {
      finish();
      return;
    }
    void Haptics.selectionAsync();
    listRef.current?.scrollToIndex({ index: index + 1, animated: !reduced });
  }, [finish, index, reduced]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const next = viewableItems[0]?.index;
    if (typeof next === "number") {
      setIndex(next);
      progress.set(withTiming(next, { duration: reduced ? 0 : 280, easing: EASE_OUT }));
    }
  }).current;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    if (width > 0) progress.set(x / width);
  };

  const last = index === SLIDES.length - 1;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 8,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
          width,
          maxWidth: "100%",
          alignSelf: "center",
        },
      ]}
    >
      <View style={styles.topBar}>
        <Text variant="eyebrow" tone="brass">
          LegalFinder
        </Text>
        {!last ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip welcome"
            onPress={finish}
            hitSlop={12}
          >
            <Text variant="small" tone="muted">
              Skip
            </Text>
          </Pressable>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <ProgressBar count={SLIDES.length} progress={progress} />

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 60 }}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index: i }) => (
          <SlidePage slide={item} width={width} active={i === index} reduced={!!reduced} />
        )}
      />

      <View style={styles.footer}>
        <Dots count={SLIDES.length} index={index} />
        <Button
          title={last ? "Get started" : "Next"}
          onPress={goNext}
          size="lg"
          fullWidth
          iconRight={
            last ? undefined : <ChevronRight size={18} color={colors.brassForeground} />
          }
        />
      </View>
    </View>
  );
}

function SlidePage({
  slide,
  width,
  active,
  reduced,
}: {
  slide: Slide;
  width: number;
  active: boolean;
  reduced: boolean;
}) {
  const Art = slide.Art;
  return (
    <View style={[styles.page, { width }]}>
      <View style={styles.artWrap}>
        <Art />
      </View>
      {active ? (
        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(420).delay(40)}
          style={styles.copy}
        >
          <Text variant="h1" style={styles.title}>
            {slide.title}
          </Text>
          <Text tone="muted" style={styles.body}>
            {slide.body}
          </Text>
        </Animated.View>
      ) : (
        <View style={styles.copy}>
          <Text variant="h1" style={styles.title}>
            {slide.title}
          </Text>
          <Text tone="muted" style={styles.body}>
            {slide.body}
          </Text>
        </View>
      )}
    </View>
  );
}

function ProgressBar({
  count,
  progress,
}: {
  count: number;
  progress: SharedValue<number>;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.progressRow}>
      {Array.from({ length: count }, (_, i) => (
        <ProgressSegment key={i} index={i} progress={progress} color={colors.brass} track={colors.border} />
      ))}
    </View>
  );
}

function ProgressSegment({
  index,
  progress,
  color,
  track,
}: {
  index: number;
  progress: SharedValue<number>;
  color: string;
  track: string;
}) {
  // Absolute fill + width (out of Yoga flow) so the bar grows from the left without scaleX smear.
  const style = useAnimatedStyle(() => {
    const p = progress.get();
    const fill = Math.min(1, Math.max(0, p - index + 1));
    return { width: `${fill * 100}%` };
  });
  return (
    <View style={[styles.segmentTrack, { backgroundColor: track }]}>
      <Animated.View style={[styles.segmentFill, { backgroundColor: color }, style]} />
    </View>
  );
}

function Dots({ count, index }: { count: number; index: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.dots} accessibilityRole="tablist">
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          accessibilityRole="tab"
          accessibilityState={{ selected: i === index }}
          style={[
            styles.dot,
            {
              backgroundColor: i === index ? colors.foreground : colors.border,
              width: i === index ? 18 : 7,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  segmentTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  segmentFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  page: {
    flex: 1,
    paddingHorizontal: 24,
  },
  artWrap: { marginBottom: 28 },
  copy: { gap: 10, paddingHorizontal: 4 },
  title: {
    fontFamily: fonts.displayBold,
    letterSpacing: -0.6,
  },
  body: { fontSize: 16, lineHeight: 24 },
  footer: {
    paddingHorizontal: 24,
    gap: 16,
    paddingTop: 8,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    height: 7,
    borderRadius: radius.full,
  },
});
