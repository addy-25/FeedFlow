import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GradientBackground } from '../../components/GradientBackground';
import { GlassCard } from '../../components/GlassCard';
import { ProgressRing } from '../../components/ProgressRing';
import { CountUp } from '../../components/CountUp';
import { Reveal } from '../../components/Reveal';
import { PrimaryButton } from '../../components/PrimaryButton';
import { api, type LogItem } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import { colors, font, radii, spacing } from '../../theme';

export default function Home() {
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [active, setActive] = useState(true);
  const [running, setRunning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await api.getLogs();
    setLogs(data);
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

  const runNow = async () => {
    setRunning(true);
    try {
      await api.triggerAutomation();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // give the worker a moment, then refresh
      setTimeout(load, 1500);
    } finally {
      setTimeout(() => setRunning(false), 1500);
    }
  };

  const actions = logs.filter((l) => l.action !== 'none');
  const actionCount = actions.length;
  const lastActivity = logs[0]?.created_at ?? null;
  const alignment = logs.length
    ? Math.round(logs.reduce((s, l) => s + l.score, 0) / logs.length)
    : 0;

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
          <View style={styles.headerRow}>
            <Text style={styles.brand}>
              Feed<Text style={{ color: colors.cyan }}>Flow</Text>
            </Text>
            <Ionicons name="notifications-outline" size={22} color={colors.textDim} />
          </View>
          <Text style={styles.h1}>Home</Text>
        </Reveal>

        {/* Automation status */}
        <Reveal delay={80}>
          <GlassCard style={{ marginTop: spacing.lg }}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabel}>Automation</Text>
                <Text style={[styles.statusText, { color: active ? colors.boost : colors.textDim }]}>
                  {active ? 'Active' : 'Paused'}
                </Text>
                <Text style={styles.cardSub}>
                  {active
                    ? 'FeedFlow is actively personalizing your feed'
                    : 'Personalization is paused'}
                </Text>
              </View>
              <Switch
                value={active}
                onValueChange={(v) => {
                  Haptics.selectionAsync();
                  setActive(v);
                }}
                trackColor={{ false: 'rgba(255,255,255,0.12)', true: colors.boost }}
                thumbColor="#fff"
              />
            </View>
            <PrimaryButton
              label={running ? 'Running…' : 'Run personalization now'}
              onPress={runNow}
              loading={running}
              disabled={!active}
              style={{ marginTop: spacing.lg }}
            />
          </GlassCard>
        </Reveal>

        {/* Stats */}
        <Reveal delay={160}>
          <View style={styles.statsRow}>
            <Stat label="Actions" value={actionCount} />
            <Stat label="Alignment" value={alignment} suffix="%" />
            <StatText label="Last activity" value={timeAgo(lastActivity)} />
          </View>
        </Reveal>

        {/* Personalization progress */}
        <Reveal delay={240}>
          <GlassCard style={{ marginTop: spacing.lg }}>
            <Text style={styles.cardLabel}>Personalization progress</Text>
            <View style={styles.progressRow}>
              <ProgressRing progress={alignment / 100} size={128}>
                <CountUp value={alignment} suffix="%" style={styles.ringNum} />
                <Text style={styles.ringSub}>Aligned</Text>
              </ProgressRing>
              <View style={{ flex: 1, marginLeft: spacing.lg }}>
                <Text style={styles.progressNote}>
                  Your feed is{' '}
                  <Text style={{ color: colors.cyan, fontWeight: '700' }}>{alignment}%</Text> aligned
                  with your chosen interests, based on the last {logs.length} posts FeedFlow scored.
                </Text>
              </View>
            </View>
          </GlassCard>
        </Reveal>

        {/* Recent activity */}
        <Reveal delay={320}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <GlassCard padded={false} style={{ marginTop: spacing.sm }}>
            {logs.slice(0, 5).map((log, i) => (
              <ActivityRow key={log.id} log={log} last={i === Math.min(4, logs.length - 1)} />
            ))}
            {logs.length === 0 && (
              <Text style={styles.empty}>No activity yet — run personalization to begin.</Text>
            )}
          </GlassCard>
        </Reveal>
      </ScrollView>
    </GradientBackground>
  );
}

function Stat({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  return (
    <GlassCard style={styles.statCard}>
      <CountUp value={value} suffix={suffix} style={styles.statNum} />
      <Text style={styles.statLabel}>{label}</Text>
    </GlassCard>
  );
}
function StatText({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard style={styles.statCard}>
      <Text style={styles.statNumSmall} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </GlassCard>
  );
}

function ActivityRow({ log, last }: { log: LogItem; last: boolean }) {
  const liked = log.action === 'liked';
  const suppressed = log.action === 'suppressed';
  const icon = liked ? 'heart' : suppressed ? 'eye-off' : 'ellipse';
  const tint = liked ? colors.boost : suppressed ? colors.reduce : colors.textMuted;
  return (
    <View style={[styles.activityRow, !last && styles.activityDivider]}>
      <View style={[styles.activityIcon, { backgroundColor: tint + '22' }]}>
        <Ionicons name={icon as any} size={15} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.activityText} numberOfLines={1}>
          {liked ? 'Boosted' : suppressed ? 'Reduced' : 'Reviewed'} @{log.username}
        </Text>
        <Text style={styles.activitySub} numberOfLines={1}>
          {log.caption ?? 'post'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.activityScore, { color: tint }]}>{log.score}</Text>
        <Text style={styles.activityTime}>{timeAgo(log.created_at)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { ...font.h2, color: colors.text },
  h1: { ...font.hero, color: colors.text, marginTop: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLabel: { ...font.label, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusText: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  cardSub: { ...font.caption, color: colors.textDim, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  statCard: { flex: 1, paddingVertical: spacing.lg, paddingHorizontal: spacing.md, alignItems: 'flex-start' },
  statNum: { fontSize: 26, fontWeight: '800', color: colors.text, width: '100%' },
  statNumSmall: { fontSize: 15, fontWeight: '700', color: colors.text },
  statLabel: { ...font.caption, color: colors.textDim, marginTop: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  ringNum: { fontSize: 30, fontWeight: '800', color: colors.text, textAlign: 'center', width: 90 },
  ringSub: { ...font.caption, color: colors.cyan },
  progressNote: { ...font.body, color: colors.textDim, lineHeight: 21 },
  sectionTitle: { ...font.h2, color: colors.text, marginTop: spacing.xl },
  activityRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  activityDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  activityIcon: { width: 32, height: 32, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  activityText: { ...font.label, color: colors.text },
  activitySub: { ...font.caption, color: colors.textMuted, marginTop: 1 },
  activityScore: { fontSize: 15, fontWeight: '800' },
  activityTime: { ...font.caption, color: colors.textMuted, marginTop: 1 },
  empty: { ...font.body, color: colors.textMuted, padding: spacing.xl, textAlign: 'center' },
});
