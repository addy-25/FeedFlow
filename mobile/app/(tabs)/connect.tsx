import { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '../../components/GradientBackground';
import { GlassCard } from '../../components/GlassCard';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Reveal } from '../../components/Reveal';
import { api, type IgStatus } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import { colors, font, radii, spacing } from '../../theme';

type UiStatus = IgStatus['status'];

const STATUS_META: Record<UiStatus, { label: string; color: string }> = {
  connected: { label: 'Connected', color: colors.boost },
  disconnected: { label: 'Disconnected', color: colors.textMuted },
  connecting: { label: 'Connecting…', color: colors.warn },
};

export default function Connect() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<IgStatus>({
    status: 'disconnected',
    username: null,
    last_sync: null,
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = await api.getInstagramStatus();
    setStatus(s);
    if (s.username) setUsername(s.username);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const connect = async () => {
    setError(null);
    if (!username.trim() || !password) {
      setError('Enter your Instagram username and password.');
      return;
    }
    setBusy(true);
    setStatus((s) => ({ ...s, status: 'connecting' }));
    try {
      await api.connectInstagram(username.trim(), password);
      setPassword('');
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Connection failed.');
      setStatus((s) => ({ ...s, status: 'disconnected' }));
    } finally {
      setBusy(false);
    }
  };

  const doDisconnect = () => {
    Alert.alert(
      'Disconnect Instagram',
      'FeedFlow will stop personalizing your feed until you reconnect.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setDisconnecting(true);
            try {
              await api.disconnectInstagram();
              setPassword('');
              await load();
            } finally {
              setDisconnecting(false);
            }
          },
        },
      ]
    );
  };

  const meta = STATUS_META[status.status];
  const connected = status.status === 'connected';

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 110 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Reveal>
            <Text style={styles.h1}>Connect</Text>
            <Text style={styles.sub}>Link the Instagram account FeedFlow will personalize.</Text>
          </Reveal>

          <Reveal delay={100}>
            <GlassCard style={{ marginTop: spacing.lg, alignItems: 'center' }}>
              <LinearGradient
                colors={['#F58529', '#DD2A7B', '#8134AF'] as const}
                style={styles.igBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="logo-instagram" size={34} color="#fff" />
              </LinearGradient>

              <View style={[styles.statusPill, { borderColor: meta.color }]}>
                <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
              </View>

              {connected && (
                <>
                  <Text style={styles.username}>@{status.username}</Text>
                  <Text style={styles.lastSync}>Last sync: {timeAgo(status.last_sync)}</Text>
                </>
              )}
            </GlassCard>
          </Reveal>

          <Reveal delay={180}>
            <GlassCard style={{ marginTop: spacing.lg }}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="your.handle"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
              <Text style={[styles.label, { marginTop: spacing.lg }]}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                style={styles.input}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <PrimaryButton
                label={connected ? 'Update Connection' : 'Connect Instagram'}
                onPress={connect}
                loading={busy}
                style={{ marginTop: spacing.xl }}
              />

              {connected && (
                <Pressable
                  onPress={doDisconnect}
                  disabled={disconnecting}
                  style={styles.disconnectBtn}
                  hitSlop={8}
                >
                  <Ionicons name="unlink-outline" size={16} color={colors.reduce} />
                  <Text style={styles.disconnectText}>
                    {disconnecting ? 'Disconnecting…' : 'Disconnect account'}
                  </Text>
                </Pressable>
              )}

              <View style={styles.privacyRow}>
                <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
                <Text style={styles.privacy}>
                  Credentials are used only to establish a session and are never shared.
                </Text>
              </View>
            </GlassCard>
          </Reveal>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg },
  h1: { ...font.hero, color: colors.text },
  sub: { ...font.body, color: colors.textDim, marginTop: spacing.sm },
  igBadge: {
    width: 76,
    height: 76,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 7,
    marginTop: spacing.lg,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { ...font.label },
  username: { ...font.h2, color: colors.text, marginTop: spacing.lg },
  lastSync: { ...font.caption, color: colors.textDim, marginTop: 4 },
  label: { ...font.label, color: colors.textDim, marginBottom: spacing.sm },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    height: 52,
    color: colors.text,
    fontSize: 15,
  },
  error: { color: colors.reduce, ...font.caption, marginTop: spacing.md },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  disconnectText: { ...font.label, color: colors.reduce },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg },
  privacy: { ...font.caption, color: colors.textMuted, flex: 1 },
});
