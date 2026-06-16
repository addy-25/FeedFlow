import { useState } from 'react';
import { Dimensions, LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, font, gradients, radii, spacing } from '../theme';

const { width } = Dimensions.get('window');
const MOCK_W = Math.min(width - spacing.xl * 2, 330);

/* ------------------------------------------------------------------ */
/* Per-slide product mockups — these explain the app instead of an     */
/* abstract orb. Each is a static, lightweight composition.            */
/* ------------------------------------------------------------------ */

function FeedMock() {
  const rows = [
    { tag: 'Artificial Intelligence', score: 96, on: true },
    { tag: 'Design', score: 88, on: true },
    { tag: 'Celebrity gossip', score: 12, on: false },
  ];
  return (
    <View style={[mock.frame, { width: MOCK_W }]}>
      <View style={mock.frameHeader}>
        <Text style={mock.frameTitle}>Your feed</Text>
        <View style={mock.livePill}>
          <View style={mock.liveDot} />
          <Text style={mock.liveText}>Live</Text>
        </View>
      </View>
      {rows.map((r) => (
        <View key={r.tag} style={mock.feedRow}>
          <LinearGradient
            colors={r.on ? gradients.boost : gradients.reduce}
            style={mock.thumb}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name={r.on ? 'arrow-up' : 'arrow-down'}
              size={16}
              color="#fff"
            />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={mock.feedTag} numberOfLines={1}>
              {r.tag}
            </Text>
            <View style={mock.barTrack}>
              <View
                style={[
                  mock.barFill,
                  { width: `${r.score}%`, backgroundColor: r.on ? colors.boost : colors.reduce },
                ]}
              />
            </View>
          </View>
          <Text style={[mock.feedScore, { color: r.on ? colors.boost : colors.reduce }]}>
            {r.score}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ChipsMock() {
  const boost = ['Technology', 'Design', 'Startups', 'Science'];
  const reduce = ['Gossip', 'Drama'];
  return (
    <View style={{ width: MOCK_W, gap: spacing.lg }}>
      <View style={mock.chipGroup}>
        <Text style={[mock.chipHeading, { color: colors.boost }]}>More of this</Text>
        <View style={mock.chipWrap}>
          {boost.map((t) => (
            <View key={t} style={[mock.chip, { borderColor: colors.boost + '55', backgroundColor: colors.boost + '14' }]}>
              <Ionicons name="arrow-up" size={13} color={colors.boost} />
              <Text style={[mock.chipText, { color: colors.boost }]}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={mock.chipGroup}>
        <Text style={[mock.chipHeading, { color: colors.reduce }]}>Less of this</Text>
        <View style={mock.chipWrap}>
          {reduce.map((t) => (
            <View key={t} style={[mock.chip, { borderColor: colors.reduce + '55', backgroundColor: colors.reduce + '14' }]}>
              <Ionicons name="arrow-down" size={13} color={colors.reduce} />
              <Text style={[mock.chipText, { color: colors.reduce }]}>{t}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function PostScoreMock() {
  return (
    <View style={[mock.frame, { width: MOCK_W, padding: spacing.lg }]}>
      <View style={mock.postHead}>
        <LinearGradient colors={gradients.brand} style={mock.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <View style={{ flex: 1 }}>
          <Text style={mock.postHandle}>@thehumane.ai</Text>
          <Text style={mock.postMeta}>Suggested · AI &amp; robotics</Text>
        </View>
        <View style={mock.scoreChip}>
          <Text style={mock.scoreNum}>92</Text>
        </View>
      </View>
      <LinearGradient colors={gradients.card} style={mock.postImage} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Ionicons name="image-outline" size={26} color={colors.textMuted} />
      </LinearGradient>
      <View style={mock.verdictRow}>
        <Ionicons name="heart" size={16} color={colors.boost} />
        <Text style={mock.verdictText}>Liked — matches your interests</Text>
      </View>
    </View>
  );
}

function AutomationMock() {
  const items = [
    { icon: 'heart' as const, color: colors.boost, label: 'Liked a post on machine learning' },
    { icon: 'eye-off' as const, color: colors.reduce, label: 'Reduced a celebrity reel' },
    { icon: 'sparkles' as const, color: colors.cyan, label: 'Feed re-ranked for you' },
  ];
  return (
    <View style={[mock.frame, { width: MOCK_W }]}>
      <View style={mock.frameHeader}>
        <View style={mock.autoTitleRow}>
          <Ionicons name="time-outline" size={16} color={colors.cyan} />
          <Text style={mock.frameTitle}>Every 30 min</Text>
        </View>
        <View style={mock.toggle}>
          <Text style={mock.toggleText}>ON</Text>
          <View style={mock.toggleKnob} />
        </View>
      </View>
      <View style={mock.divider} />
      {items.map((it) => (
        <View key={it.label} style={mock.autoRow}>
          <View style={[mock.autoIcon, { backgroundColor: it.color + '1A' }]}>
            <Ionicons name={it.icon} size={14} color={it.color} />
          </View>
          <Text style={mock.autoLabel} numberOfLines={1}>
            {it.label}
          </Text>
          <Ionicons name="checkmark" size={15} color={colors.textMuted} />
        </View>
      ))}
    </View>
  );
}

const SLIDES = [
  {
    key: 'what',
    title: 'Your feed,\non your terms',
    body: 'FeedFlow quietly retrains your Instagram feed around what you actually care about — no doomscrolling required.',
    Visual: FeedMock,
  },
  {
    key: 'interests',
    title: 'Tell it what\nmatters to you',
    body: 'Boost the topics you love and mute the ones you don’t. FeedFlow turns those choices into real actions.',
    Visual: ChipsMock,
  },
  {
    key: 'score',
    title: 'AI scores\nevery post',
    body: 'Each candidate post is rated 0–100 for how relevant it is to you — before FeedFlow likes or skips it.',
    Visual: PostScoreMock,
  },
  {
    key: 'auto',
    title: 'Then it runs\non autopilot',
    body: 'Pick a schedule and let it work in the background. Your feed keeps getting sharper, day after day.',
    Visual: AutomationMock,
  },
];

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const x = useSharedValue(0);
  const [page, setPage] = useState(0);
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

  const last = page === SLIDES.length - 1;

  return (
    <GradientBackground>
      <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.topBar}>
          <Text style={styles.brand}>
            Feed<Text style={{ color: colors.cyan }}>Flow</Text>
          </Text>
          {!last && (
            <Text style={styles.skip} onPress={() => router.replace('/login')}>
              Skip
            </Text>
          )}
        </View>

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
            label={last ? 'Get Started' : 'Continue'}
            onPress={() => router.replace('/login')}
            style={{ marginTop: spacing.xl }}
          />
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
  const visualStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      transform: [
        { scale: interpolate(x.value, input, [0.86, 1, 0.86], Extrapolation.CLAMP) },
        { translateX: interpolate(x.value, input, [width * 0.18, 0, -width * 0.18], Extrapolation.CLAMP) },
      ],
      opacity: interpolate(x.value, input, [0.3, 1, 0.3], Extrapolation.CLAMP),
    };
  });
  const textStyle = useAnimatedStyle(() => {
    const input = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      opacity: interpolate(x.value, input, [0, 1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(x.value, input, [24, 0, 24], Extrapolation.CLAMP) }],
    };
  });

  const { Visual } = slide;

  return (
    <View style={[styles.slide, { width, height }]}>
      <Animated.View style={[styles.visual, visualStyle]}>
        <Visual />
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
      opacity: interpolate(x.value, input, [0.3, 1, 0.3], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  brand: { ...font.h2, color: colors.text },
  skip: { ...font.label, color: colors.textDim },
  pager: { flex: 1 },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  visual: { alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xxl },
  title: { ...font.hero, color: colors.text, textAlign: 'center', lineHeight: 38 },
  body: {
    ...font.body,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },
  footer: { marginTop: 'auto', paddingHorizontal: spacing.xl },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, height: 8 },
  dot: { height: 8, borderRadius: 4, backgroundColor: colors.cyan },
});

/* mockup styles */
const mock = StyleSheet.create({
  frame: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  frameHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  frameTitle: { ...font.label, color: colors.text },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.boost + '1A',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.boost },
  liveText: { ...font.caption, color: colors.boost },
  // feed rows
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: { width: 34, height: 34, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  feedTag: { ...font.label, color: colors.text, marginBottom: 6 },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  feedScore: { ...font.h2, width: 34, textAlign: 'right' },
  // chips
  chipGroup: { gap: spacing.sm },
  chipHeading: { ...font.label, marginLeft: 2 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  chipText: { ...font.label },
  // post card
  postHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  postHandle: { ...font.label, color: colors.text },
  postMeta: { ...font.caption, color: colors.textDim, marginTop: 2 },
  scoreChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.boost + '1F',
    borderWidth: 1.5,
    borderColor: colors.boost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNum: { ...font.h2, color: colors.boost },
  postImage: {
    height: 120,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  verdictRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  verdictText: { ...font.caption, color: colors.textDim },
  // automation
  autoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cyan + '1F',
    borderRadius: radii.pill,
    paddingLeft: spacing.md,
    paddingRight: 4,
    paddingVertical: 3,
  },
  toggleText: { ...font.caption, color: colors.cyan, fontWeight: '700' },
  toggleKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.cyan },
  divider: { height: 1, backgroundColor: colors.border },
  autoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  autoIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  autoLabel: { ...font.caption, color: colors.text, flex: 1 },
});
