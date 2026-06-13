import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground } from '../../components/GradientBackground';
import { GlassCard } from '../../components/GlassCard';
import { Reveal } from '../../components/Reveal';
import { CountUp } from '../../components/CountUp';
import { api, type LogItem } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import { colors, font, radii, spacing } from '../../theme';

type Filter = 'all' | 'liked' | 'suppressed';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'liked', label: 'Boosted' },
  { key: 'suppressed', label: 'Reduced' },
];

export default function Analytics() {
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLogs(await api.getLogs());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const boosted = logs.filter((l) => l.action === 'liked').length;
  const reduced = logs.filter((l) => l.action === 'suppressed').length;
  const shown = filter === 'all' ? logs : logs.filter((l) => l.action === filter);

  return (
    <GradientBackground>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cyan} />
        }
      >
        <Reveal>
          <Text style={styles.h1}>Activity</Text>
          <Text style={styles.sub}>Every decision FeedFlow made on your behalf.</Text>
        </Reveal>

        <Reveal delay={80}>
          <View style={styles.summary}>
            <Summary label="Scored" value={logs.length} color={colors.cyan} />
            <Summary label="Boosted" value={boosted} color={colors.boost} />
            <Summary label="Reduced" value={reduced} color={colors.reduce} />
          </View>
        </Reveal>

        <Reveal delay={140}>
          <View style={styles.filters}>
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  style={[styles.filterChip, active && styles.filterActive]}
                >
                  <Text style={[styles.filterText, active && { color: colors.bg }]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Reveal>

        {shown.map((log, i) => (
          <Reveal key={log.id} delay={180 + i * 60}>
            <LogCard log={log} />
          </Reveal>
        ))}

        {shown.length === 0 && (
          <Reveal delay={200}>
            <Text style={styles.empty}>No activity in this view yet.</Text>
          </Reveal>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

function Summary({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <GlassCard style={styles.summaryCard}>
      <CountUp value={value} style={[styles.summaryNum, { color }]} />
      <Text style={styles.summaryLabel}>{label}</Text>
    </GlassCard>
  );
}

function LogCard({ log }: { log: LogItem }) {
  const liked = log.action === 'liked';
  const suppressed = log.action === 'suppressed';
  const tint = liked ? colors.boost : suppressed ? colors.reduce : colors.textMuted;
  const tag = liked ? 'Boosted' : suppressed ? 'Reduced' : 'Reviewed';

  return (
    <GlassCard style={{ marginTop: spacing.md }}>
      <View style={styles.logTop}>
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <Text style={styles.logCaption} numberOfLines={2}>
            {log.caption ?? 'Untitled post'}
          </Text>
          <Text style={styles.logMeta}>
            @{log.username} · {timeAgo(log.created_at)}
          </Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={[styles.scoreNum, { color: tint }]}>{log.score}</Text>
          <Text style={styles.scoreOutOf}>/100</Text>
        </View>
      </View>

      {log.reason && (
        <Text style={styles.reason} numberOfLines={3}>
          {log.reason}
        </Text>
      )}

      <View style={[styles.tag, { backgroundColor: tint + '22' }]}>
        <Text style={[styles.tagText, { color: tint }]}>{tag}</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg },
  h1: { ...font.hero, color: colors.text },
  sub: { ...font.body, color: colors.textDim, marginTop: spacing.sm },
  summary: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg },
  summaryNum: { fontSize: 26, fontWeight: '800', textAlign: 'center', minWidth: 40 },
  summaryLabel: { ...font.caption, color: colors.textDim, marginTop: 2 },
  filters: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActive: { backgroundColor: colors.cyan, borderColor: colors.cyan },
  filterText: { ...font.label, color: colors.textDim },
  logTop: { flexDirection: 'row', alignItems: 'flex-start' },
  logCaption: { ...font.h2, color: colors.text, fontSize: 16, lineHeight: 21 },
  logMeta: { ...font.caption, color: colors.textMuted, marginTop: 4 },
  scoreBox: { flexDirection: 'row', alignItems: 'baseline' },
  scoreNum: { fontSize: 30, fontWeight: '800' },
  scoreOutOf: { ...font.caption, color: colors.textMuted, marginLeft: 1 },
  reason: { ...font.body, color: colors.textDim, marginTop: spacing.md, lineHeight: 20 },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.sm,
    marginTop: spacing.md,
  },
  tagText: { ...font.caption, fontWeight: '700' },
  empty: { ...font.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl },
});
