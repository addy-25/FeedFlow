import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { GradientBackground } from '../../components/GradientBackground';
import { GlassCard } from '../../components/GlassCard';
import { Reveal } from '../../components/Reveal';
import { ScreenHeader } from '../../components/ScreenHeader';
import { api } from '../../lib/api';
import { isNotificationsEnabled, setNotificationsEnabled } from '../../lib/notifications';
import { getStoredInterval, setStoredInterval } from '../../lib/localSettings';
import { useAuth } from '../../lib/auth';
import { colors, font, radii, spacing } from '../../theme';

const INTERVAL_OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 15, label: '15m' },
  { minutes: 30, label: '30m' },
  { minutes: 60, label: '1h' },
  { minutes: 180, label: '3h' },
  { minutes: 360, label: '6h' },
  { minutes: 720, label: '12h' },
  { minutes: 1440, label: 'Daily' },
];

export default function Profile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAuth();
  const [handle, setHandle] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [automation, setAutomation] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [intervalMin, setIntervalMin] = useState(60);
  const [savingInterval, setSavingInterval] = useState(false);

  const load = useCallback(async () => {
    // Locally-stored interval is the sticky source of truth for the UI (survives
    // restarts even when the backend is unreachable).
    const stored = await getStoredInterval();
    setIntervalMin(stored);

    const [s, me, notifOn] = await Promise.all([
      api.getInstagramStatus(),
      api.getMe(),
      isNotificationsEnabled(),
    ]);
    setHandle(s.username);
    setEmail(me.email);
    setNotifications(notifOn);

    // Best-effort: make sure the backend (and thus Celery) matches the stored
    // choice, in case an earlier save happened while offline.
    api.updateSettings(stored).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleNotifications = async (v: boolean) => {
    Haptics.selectionAsync();
    setNotifications(v);
    await setNotificationsEnabled(v);
  };

  const chooseInterval = async (minutes: number) => {
    if (minutes === intervalMin) return;
    Haptics.selectionAsync();
    setIntervalMin(minutes);            // optimistic UI
    await setStoredInterval(minutes);   // persist locally — survives restarts
    setSavingInterval(true);
    try {
      await api.updateSettings(minutes); // sync to backend so Celery respects it
    } finally {
      setSavingInterval(false);
    }
  };

  const doLogout = async () => {
    await logout();
    router.replace('/login');
  };

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
          <ScreenHeader title="Profile" />
        </Reveal>

        <Reveal delay={80}>
          <GlassCard style={{ marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
            <LinearGradient
              colors={['#7C3AED', '#3B82F6'] as const}
              style={styles.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.avatarText}>{(handle ?? 'F')[0].toUpperCase()}</Text>
            </LinearGradient>
            <View style={{ marginLeft: spacing.lg, flex: 1 }}>
              <Text style={styles.name}>{handle ? `@${handle}` : 'FeedFlow User'}</Text>
              <Text style={styles.email} numberOfLines={1}>
                {email ?? 'Personalizing your Instagram feed'}
              </Text>
            </View>
          </GlassCard>
        </Reveal>

        <Reveal delay={160}>
          <Text style={styles.section}>Controls</Text>
          <GlassCard padded={false} style={{ marginTop: spacing.sm }}>
            <ToggleRow
              icon="flash"
              label="Automation"
              sub={automation ? 'Personalization is on' : 'Personalization is off'}
              value={automation}
              onChange={(v) => {
                Haptics.selectionAsync();
                setAutomation(v);
              }}
            />
            <Divider />
            <ToggleRow
              icon="notifications"
              label="Notifications"
              sub={notifications ? 'Alerts when your feed updates' : 'Muted'}
              value={notifications}
              onChange={toggleNotifications}
            />
          </GlassCard>
        </Reveal>

        <Reveal delay={200}>
          <Text style={styles.section}>Automation schedule</Text>
          <GlassCard style={{ marginTop: spacing.sm }}>
            <View style={styles.scheduleHeader}>
              <Ionicons name="time-outline" size={18} color={colors.cyan} />
              <Text style={styles.scheduleLabel}>Run automatically every</Text>
            </View>
            <Text style={styles.scheduleSub}>
              How often FeedFlow re-runs personalization on its own.
            </Text>
            <View style={styles.intervalRow}>
              {INTERVAL_OPTIONS.map((opt) => {
                const active = opt.minutes === intervalMin;
                return (
                  <Pressable
                    key={opt.minutes}
                    onPress={() => chooseInterval(opt.minutes)}
                    disabled={savingInterval}
                    style={[styles.intervalChip, active && styles.intervalChipActive]}
                  >
                    <Text style={[styles.intervalText, active && { color: colors.bg }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>
        </Reveal>

        <Reveal delay={240}>
          <Text style={styles.section}>Login & security</Text>
          <GlassCard padded={false} style={{ marginTop: spacing.sm }}>
            <NavRow
              icon="mail"
              label="Email"
              sub={email ?? 'Loading…'}
              onPress={() => router.push('/change-email')}
            />
            <Divider />
            <NavRow
              icon="lock-closed"
              label="Password"
              sub="Change your password"
              onPress={() => router.push('/change-password')}
            />
          </GlassCard>
        </Reveal>

        <Reveal delay={300}>
          <Text style={styles.section}>Account</Text>
          <GlassCard padded={false} style={{ marginTop: spacing.sm }}>
            <NavRow
              icon="options"
              label="Content Preferences"
              sub="Manage your interests"
              onPress={() => router.push('/(tabs)/preferences')}
            />
            <Divider />
            <NavRow
              icon="logo-instagram"
              label="Connected Account"
              sub={handle ? `@${handle}` : 'Not connected'}
              onPress={() => router.push('/(tabs)/connect')}
            />
          </GlassCard>
        </Reveal>

        <Reveal delay={360}>
          <GlassCard padded={false} style={{ marginTop: spacing.xl }}>
            <Pressable style={styles.row} onPress={doLogout}>
              <View style={[styles.rowIcon, { backgroundColor: colors.reduce + '22' }]}>
                <Ionicons name="log-out-outline" size={18} color={colors.reduce} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.reduce }]}>Log out</Text>
            </Pressable>
          </GlassCard>
        </Reveal>
      </ScrollView>
    </GradientBackground>
  );
}

function ToggleRow({
  icon,
  label,
  sub,
  value,
  onChange,
}: {
  icon: any;
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.cyan} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: 'rgba(255,255,255,0.12)', true: colors.boost }}
        thumbColor="#fff"
      />
    </View>
  );
}

function NavRow({
  icon,
  label,
  sub,
  onPress,
}: {
  icon: any;
  label: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.cyan} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg },
  h1: { ...font.hero, color: colors.text },
  avatar: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '800', color: '#fff' },
  name: { ...font.h2, color: colors.text },
  email: { ...font.caption, color: colors.textDim, marginTop: 2 },
  section: { ...font.label, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(34,211,238,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { ...font.label, color: colors.text, fontSize: 15 },
  rowSub: { ...font.caption, color: colors.textDim, marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 58 },
  scheduleHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scheduleLabel: { ...font.label, color: colors.text, fontSize: 15 },
  scheduleSub: { ...font.caption, color: colors.textDim, marginTop: 4 },
  intervalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  intervalChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 52,
    alignItems: 'center',
  },
  intervalChipActive: { backgroundColor: colors.cyan, borderColor: colors.cyan },
  intervalText: { ...font.label, color: colors.textDim },
});

