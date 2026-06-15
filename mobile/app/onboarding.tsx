import { useState } from 'react';
import { Dimensions, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { GradientBackground } from '../components/GradientBackground';
import { Globe } from '../components/Globe';
import { ProgressRing } from '../components/ProgressRing';
import { CountUp } from '../components/CountUp';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, font, spacing } from '../theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    key: 'learn',
    title: 'Train your feed,\nnot your finger',
    body: 'FeedFlow learns what content actually matters to you and quietly reinforces it on Instagram — so your feed gets better on its own.',
  },
  {
    key: 'score',
    title: 'AI scores\nevery post',
    body: 'FeedFlow’s AI reads each candidate post and rates how relevant it is to your interests — from 0 to 100 — before any action is taken.',
  },
  {
    key: 'grow',
    title: 'Your feed,\nrebuilt over time',
    body: 'Connect your account, pick what you want more of, and let FeedFlow run. Watch your feed realign to you, day after day.',
  },
];

function SlideVisual({ index }: { index: number }) {
  if (index === 1)
    return (
      <ProgressRing progress={0.92} size={190} stroke={14}>
        <CountUp value={92} suffix="" style={styles.scoreNum} />
        <Text style={styles.scoreLabel}>Relevant</Text>
      </ProgressRing>
    );
  return <Globe size={220} />;
}

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const x = useSharedValue(0);
  const [page, setPage] = useState(0);
  // Measure the pager region so every slide gets the SAME fixed height —
  // otherwise slides size to their text and vertical centering jumps per page.
  const [pagerHeight, setPagerHeight] = useState(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      x.value = e.contentOffset.x;
    },
  });

  const onPagerLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== pagerHeight) setPagerHeight(h);
  };

  return (
    <GradientBackground>
      <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.brand}>
          Feed<Text style={{ color: colors.cyan }}>Flow</Text>
        </Text>

        <View style={styles.pager} onLayout={onPagerLayout}>
          {pagerHeight > 0 && (
            <Animated.ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onScroll}
              scrollEventThrottle={16}
              onMomentumScrollEnd={(e) =>
                setPage(Math.round(e.nativeEvent.contentOffset.x / width))
              }
            >
              {SLIDES.map((slide, i) => (
                <Slide key={slide.key} slide={slide} index={i} x={x} height={pagerHeight} />
              ))}
            </Animated.ScrollView>
          )}
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <Dot key={i} index={i} x={x} />
            ))}
          </View>
          <PrimaryButton
            label={page === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
            onPress={() => router.replace('/login')}
            style={{ marginTop: spacing.xl }}
          />
          <Text style={styles.skip} onPress={() => router.replace('/login')}>
            Skip intro
          </Text>
        </View>
      </View>
    </GradientBackground>
  );
}

function Slide({
  slide,
  index,
  x,
  height,
}: {
  slide: (typeof SLIDES)[number];
  index: number;
  x: SharedValue<number>;
  height: number;
}) {
  // parallax: visual and text drift/scale as the slide enters and leaves
  const visualStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      transform: [
        { scale: interpolate(x.value, input, [0.6, 1, 0.6], Extrapolation.CLAMP) },
        { translateX: interpolate(x.value, input, [width * 0.3, 0, -width * 0.3], Extrapolation.CLAMP) },
      ],
      opacity: interpolate(x.value, input, [0.2, 1, 0.2], Extrapolation.CLAMP),
    };
  });
  const textStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      opacity: interpolate(x.value, input, [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(x.value, input, [30, 0, 30], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <View style={[styles.slide, { width, height }]}>
      <Animated.View style={[styles.visual, visualStyle]}>
        <SlideVisual index={index} />
      </Animated.View>
      <Animated.View style={textStyle}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </Animated.View>
    </View>
  );
}

function Dot({ index, x }: { index: number; x: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      width: interpolate(x.value, input, [8, 26, 8], Extrapolation.CLAMP),
      opacity: interpolate(x.value, input, [0.35, 1, 0.35], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.xl },
  brand: { ...font.h2, color: colors.text, textAlign: 'center', marginTop: spacing.md },
  pager: { flex: 1 },
  slide: { alignItems: 'center', justifyContent: 'center' },
  visual: { height: 240, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  title: { ...font.hero, color: colors.text, textAlign: 'center', lineHeight: 38 },
  body: {
    ...font.body,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 23,
    paddingHorizontal: spacing.sm,
  },
  footer: { marginTop: 'auto' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, height: 8 },
  dot: { height: 8, borderRadius: 4, backgroundColor: colors.cyan },
  skip: { ...font.label, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  scoreNum: { fontSize: 44, fontWeight: '800', color: colors.text, textAlign: 'center', width: 120 },
  scoreLabel: { ...font.label, color: colors.cyan, marginTop: 2 },
});
