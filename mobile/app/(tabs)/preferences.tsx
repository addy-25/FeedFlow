import { useCallback, useState } from 'react';
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { GradientBackground } from '../../components/GradientBackground';
import { GlassCard } from '../../components/GlassCard';
import { Globe } from '../../components/Globe';
import { Reveal } from '../../components/Reveal';
import { ScreenHeader } from '../../components/ScreenHeader';
import { api, type PrefMode } from '../../lib/api';
import { colors, font, radii, spacing, TOPIC_CATALOG } from '../../theme';

type State = Record<string, PrefMode>;
const SCREEN_W = Dimensions.get('window').width;

const TINT: Record<PrefMode, string> = { boost: colors.boost, reduce: colors.reduce };

export default function Preferences() {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<State>({});
  const [extra, setExtra] = useState<string[]>([]);
  const [addingTo, setAddingTo] = useState<PrefMode | null>(null);
  const [draft, setDraft] = useState('');
  const [draggingCol, setDraggingCol] = useState<PrefMode | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSug, setLoadingSug] = useState(false);

  const persist = (next: State) => {
    const prefs = Object.entries(next).map(([topic, mode]) => ({ topic, mode }));
    api.setPreferences(prefs);
  };

  const refreshSuggestions = useCallback(async (current: State) => {
    const boosts = Object.entries(current)
      .filter(([, m]) => m === 'boost')
      .map(([t]) => t);
    if (boosts.length === 0) {
      setSuggestions([]);
      return;
    }
    setLoadingSug(true);
    try {
      const s = await api.suggestTopics(boosts);
      setSuggestions(s.filter((t) => !current[t] && !TOPIC_CATALOG.includes(t as any)));
    } finally {
      setLoadingSug(false);
    }
  }, []);

  const load = useCallback(async () => {
    const prefs = await api.getPreferences();
    const next: State = {};
    const ex: string[] = [];
    for (const p of prefs) {
      next[p.topic] = p.mode;
      if (!TOPIC_CATALOG.includes(p.topic as any)) ex.push(p.topic);
    }
    setState(next);
    setExtra(ex);
    refreshSuggestions(next);
  }, [refreshSuggestions]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const move = (topic: string, toMode: PrefMode) => {
    setState((prev) => {
      if (prev[topic] === toMode) return prev;
      Haptics.selectionAsync();
      const next = { ...prev, [topic]: toMode };
      persist(next);
      return next;
    });
  };

  const remove = (topic: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState((prev) => {
      const next = { ...prev };
      delete next[topic];
      persist(next);
      return next;
    });
  };

  const addTopic = (mode: PrefMode) => {
    const t = draft.trim();
    setAddingTo(null);
    setDraft('');
    if (!t) return;
    if (!TOPIC_CATALOG.includes(t as any) && !extra.includes(t)) setExtra((e) => [...e, t]);
    setState((prev) => {
      const next = { ...prev, [t]: mode };
      persist(next);
      return next;
    });
  };

  const reset = () => {
    Alert.alert('Reset interests', 'Remove all of your Boost and Reduce topics?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setState({});
          setExtra([]);
          setSuggestions([]);
          persist({});
        },
      },
    ]);
  };

  const acceptSuggestion = (topic: string) => {
    Haptics.selectionAsync();
    if (!TOPIC_CATALOG.includes(topic as any) && !extra.includes(topic)) {
      setExtra((e) => [...e, topic]);
    }
    setState((prev) => {
      const next = { ...prev, [topic]: 'boost' as PrefMode };
      persist(next);
      return next;
    });
    setSuggestions((s) => s.filter((t) => t !== topic));
  };

  const boostItems = Object.keys(state).filter((t) => state[t] === 'boost');
  const reduceItems = Object.keys(state).filter((t) => state[t] === 'reduce');

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Reveal>
          <ScreenHeader
            title="Interests"
            right={
              <Pressable onPress={reset} hitSlop={10} style={styles.resetBtn}>
                <Ionicons name="refresh" size={15} color={colors.violetSoft} />
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
            }
          />
          <Text style={styles.sub}>Drag a topic across — or tap its arrow — to reshape your feed.</Text>
        </Reveal>

        <Reveal delay={80}>
          <View style={styles.board}>
            {/* sphere behind the two columns */}
            <View style={styles.globeLayer} pointerEvents="none">
              <Globe size={SCREEN_W * 0.62} />
            </View>

            <View style={styles.columns}>
              <Column
                mode="boost"
                title="Boost"
                subtitle="See more"
                items={boostItems}
                elevated={draggingCol === 'boost'}
                adding={addingTo === 'boost'}
                draft={draft}
                onDraft={setDraft}
                onAddPress={() => setAddingTo('boost')}
                onAddSubmit={() => addTopic('boost')}
                onMove={move}
                onRemove={remove}
                onDragState={setDraggingCol}
              />
              <Column
                mode="reduce"
                title="Reduce"
                subtitle="See less"
                items={reduceItems}
                elevated={draggingCol === 'reduce'}
                adding={addingTo === 'reduce'}
                draft={draft}
                onDraft={setDraft}
                onAddPress={() => setAddingTo('reduce')}
                onAddSubmit={() => addTopic('reduce')}
                onMove={move}
                onRemove={remove}
                onDragState={setDraggingCol}
              />
            </View>
          </View>
          <Text style={styles.caption}>Your interest profile adapts as you choose</Text>
        </Reveal>

        {(suggestions.length > 0 || loadingSug) && (
          <Reveal delay={160}>
            <GlassCard style={{ marginTop: spacing.lg }}>
              <View style={styles.sugHeader}>
                <View style={styles.sugTitleRow}>
                  <Ionicons name="sparkles" size={15} color={colors.cyan} />
                  <Text style={styles.sugTitle}>Suggested for you</Text>
                </View>
                <Pressable onPress={() => refreshSuggestions(state)} hitSlop={10}>
                  <Ionicons
                    name="refresh"
                    size={16}
                    color={loadingSug ? colors.textMuted : colors.cyan}
                  />
                </Pressable>
              </View>
              <Text style={styles.sugSub}>
                Based on what you want more of, Claude thinks you might also like:
              </Text>
              {loadingSug && suggestions.length === 0 ? (
                <Text style={styles.sugLoading}>Thinking…</Text>
              ) : (
                <View style={styles.sugChips}>
                  {suggestions.map((topic) => (
                    <Pressable key={topic} style={styles.sugChip} onPress={() => acceptSuggestion(topic)}>
                      <Ionicons name="add" size={14} color={colors.cyan} />
                      <Text style={styles.sugChipText}>{topic}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </GlassCard>
          </Reveal>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

function Column({
  mode,
  title,
  subtitle,
  items,
  elevated,
  adding,
  draft,
  onDraft,
  onAddPress,
  onAddSubmit,
  onMove,
  onRemove,
  onDragState,
}: {
  mode: PrefMode;
  title: string;
  subtitle: string;
  items: string[];
  elevated: boolean;
  adding: boolean;
  draft: string;
  onDraft: (s: string) => void;
  onAddPress: () => void;
  onAddSubmit: () => void;
  onMove: (topic: string, to: PrefMode) => void;
  onRemove: (topic: string) => void;
  onDragState: (m: PrefMode | null) => void;
}) {
  const tint = TINT[mode];
  return (
    <View style={[styles.column, { borderColor: tint + '55', zIndex: elevated ? 10 : 1 }]}>
      <Text style={[styles.colTitle, { color: tint }]}>{title}</Text>
      <Text style={styles.colSub}>{subtitle}</Text>

      <View style={styles.cardList}>
        {items.map((topic) => (
          <TopicCard
            key={topic}
            topic={topic}
            mode={mode}
            onMove={onMove}
            onRemove={onRemove}
            onDragState={onDragState}
          />
        ))}

        {items.length === 0 && !adding && <Text style={styles.colEmpty}>Nothing here yet</Text>}

        {adding ? (
          <TextInput
            value={draft}
            onChangeText={onDraft}
            placeholder="Topic name"
            placeholderTextColor={colors.textMuted}
            autoFocus
            onSubmitEditing={onAddSubmit}
            onBlur={onAddSubmit}
            style={[styles.addInput, { borderColor: tint }]}
          />
        ) : (
          <Pressable style={[styles.addBtn, { borderColor: tint + '88' }]} onPress={onAddPress}>
            <Ionicons name="add" size={15} color={tint} />
            <Text style={[styles.addText, { color: tint }]}>Add Topic</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function TopicCard({
  topic,
  mode,
  onMove,
  onRemove,
  onDragState,
}: {
  topic: string;
  mode: PrefMode;
  onMove: (topic: string, to: PrefMode) => void;
  onRemove: (topic: string) => void;
  onDragState: (m: PrefMode | null) => void;
}) {
  const tint = TINT[mode];
  const other: PrefMode = mode === 'boost' ? 'reduce' : 'boost';
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const active = useSharedValue(0);

  const drop = (absoluteX: number) => {
    const target: PrefMode = absoluteX < SCREEN_W / 2 ? 'boost' : 'reduce';
    onDragState(null);
    if (target !== mode) onMove(topic, target);
  };

  const pan = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(() => {
      active.value = 1;
      runOnJS(onDragState)(mode);
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(drop)(e.absoluteX);
      tx.value = withSpring(0);
      ty.value = withSpring(0);
      active.value = 0;
    });

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: withTiming(active.value ? 1.06 : 1, { duration: 120 }) },
    ],
    zIndex: active.value ? 100 : 1,
    elevation: active.value ? 8 : 0,
    opacity: active.value ? 0.97 : 1,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.card, { backgroundColor: tint + '1F', borderColor: tint + '66' }, animated]}
      >
        <Text style={styles.cardLabel} numberOfLines={1}>
          {topic}
        </Text>
        <View style={styles.cardActions}>
          <Pressable onPress={() => onMove(topic, other)} hitSlop={8}>
            <Ionicons
              name={mode === 'boost' ? 'arrow-forward' : 'arrow-back'}
              size={16}
              color={tint}
            />
          </Pressable>
          <Pressable onPress={() => onRemove(topic)} hitSlop={8}>
            <Ionicons name="close" size={15} color={colors.textMuted} />
          </Pressable>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { ...font.hero, color: colors.text },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resetText: { ...font.label, color: colors.violetSoft },
  sub: { ...font.body, color: colors.textDim, marginTop: spacing.sm, lineHeight: 21 },

  board: { marginTop: spacing.lg, position: 'relative' },
  globeLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  columns: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  column: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(10,10,20,0.55)',
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  colTitle: { ...font.h2 },
  colSub: { ...font.caption, color: colors.textDim, marginTop: 2 },
  cardList: { marginTop: spacing.md, gap: spacing.sm },
  colEmpty: { ...font.caption, color: colors.textMuted, paddingVertical: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  cardLabel: { ...font.label, color: colors.text, flex: 1, marginRight: spacing.sm },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radii.md,
    height: 44,
    marginTop: spacing.xs,
  },
  addText: { ...font.label },
  addInput: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 44,
    color: colors.text,
    fontSize: 13,
  },
  caption: { ...font.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },

  sugHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sugTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sugTitle: { ...font.h2, color: colors.text, fontSize: 16 },
  sugSub: { ...font.caption, color: colors.textDim, marginTop: spacing.sm, lineHeight: 18 },
  sugLoading: { ...font.body, color: colors.textMuted, marginTop: spacing.md },
  sugChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  sugChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.cyan,
    backgroundColor: 'rgba(34,211,238,0.08)',
  },
  sugChipText: { ...font.label, color: colors.text },
});
