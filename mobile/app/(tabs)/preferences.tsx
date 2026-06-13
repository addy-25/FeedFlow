import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GradientBackground } from '../../components/GradientBackground';
import { GlassCard } from '../../components/GlassCard';
import { Globe } from '../../components/Globe';
import { Reveal } from '../../components/Reveal';
import { api, type PrefMode } from '../../lib/api';
import { colors, font, radii, spacing, TOPIC_CATALOG } from '../../theme';

type State = Record<string, PrefMode>;

export default function Preferences() {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<State>({});
  const [extra, setExtra] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

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
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const persist = (next: State) => {
    const prefs = Object.entries(next).map(([topic, mode]) => ({ topic, mode }));
    api.setPreferences(prefs); // fire-and-forget; demo fallback handles offline
  };

  const cycle = (topic: string) => {
    Haptics.selectionAsync();
    setState((prev) => {
      const cur = prev[topic];
      const next = { ...prev };
      if (!cur) next[topic] = 'boost';
      else if (cur === 'boost') next[topic] = 'reduce';
      else delete next[topic];
      persist(next);
      return next;
    });
  };

  const addCustom = () => {
    const t = draft.trim();
    if (!t) {
      setAdding(false);
      return;
    }
    if (!TOPIC_CATALOG.includes(t as any) && !extra.includes(t)) setExtra((e) => [...e, t]);
    setState((prev) => {
      const next = { ...prev, [t]: 'boost' as PrefMode };
      persist(next);
      return next;
    });
    setDraft('');
    setAdding(false);
  };

  const boostCount = Object.values(state).filter((m) => m === 'boost').length;
  const reduceCount = Object.values(state).filter((m) => m === 'reduce').length;
  const allTopics = [...TOPIC_CATALOG, ...extra];

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
          <Text style={styles.h1}>Interests</Text>
          <Text style={styles.sub}>
            Tap once to see more, twice to see less. Your feed reshapes around this.
          </Text>
        </Reveal>

        <Reveal delay={80}>
          <View style={styles.globeWrap}>
            <Globe size={190} />
          </View>
        </Reveal>

        <Reveal delay={140}>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.boost }]} />
              <Text style={styles.legendText}>More · {boostCount}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.reduce }]} />
              <Text style={styles.legendText}>Less · {reduceCount}</Text>
            </View>
          </View>
        </Reveal>

        <Reveal delay={200}>
          <GlassCard style={{ marginTop: spacing.md }}>
            <View style={styles.chips}>
              {allTopics.map((topic) => (
                <Chip key={topic} topic={topic} mode={state[topic]} onPress={() => cycle(topic)} />
              ))}

              {adding ? (
                <View style={styles.addInputWrap}>
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Topic name"
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                    onSubmitEditing={addCustom}
                    onBlur={addCustom}
                    style={styles.addInput}
                  />
                </View>
              ) : (
                <Pressable style={styles.addChip} onPress={() => setAdding(true)}>
                  <Ionicons name="add" size={16} color={colors.cyan} />
                  <Text style={styles.addText}>Add topic</Text>
                </Pressable>
              )}
            </View>
          </GlassCard>
        </Reveal>
      </ScrollView>
    </GradientBackground>
  );
}

function Chip({
  topic,
  mode,
  onPress,
}: {
  topic: string;
  mode?: PrefMode;
  onPress: () => void;
}) {
  const isBoost = mode === 'boost';
  const isReduce = mode === 'reduce';
  const bg = isBoost ? colors.boost + '26' : isReduce ? colors.reduce + '26' : 'rgba(255,255,255,0.05)';
  const border = isBoost ? colors.boost : isReduce ? colors.reduce : colors.border;
  const tint = isBoost ? colors.boost : isReduce ? colors.reduce : colors.textDim;

  return (
    <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: bg, borderColor: border }]}>
      {mode && (
        <Ionicons
          name={isBoost ? 'arrow-up' : 'arrow-down'}
          size={13}
          color={tint}
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={[styles.chipText, { color: mode ? colors.text : colors.textDim }]}>{topic}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg },
  h1: { ...font.hero, color: colors.text },
  sub: { ...font.body, color: colors.textDim, marginTop: spacing.sm, lineHeight: 21 },
  globeWrap: { alignItems: 'center', marginVertical: spacing.lg },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { ...font.label, color: colors.textDim },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  chipText: { ...font.label },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.cyan,
    borderStyle: 'dashed',
  },
  addText: { ...font.label, color: colors.cyan },
  addInputWrap: { minWidth: 120 },
  addInput: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.cyan,
    color: colors.text,
    fontSize: 13,
  },
});
