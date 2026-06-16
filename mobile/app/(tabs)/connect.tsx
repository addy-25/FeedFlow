import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { ScreenHeader } from '../../components/ScreenHeader';
import { api, type IgStatus } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import { colors, font, radii, spacing } from '../../theme';

// react-native-webview and @react-native-cookies/cookies are native modules not
// bundled in Expo Go. Try to load them — if they throw, fall back to null so
// the app doesn't crash. In the built APK they load fine.
let WebView: any = null;
let CookieManager: any = null;
try { WebView = require('react-native-webview').default; } catch {}
try { CookieManager = require('@react-native-cookies/cookies').default; } catch {}

const IG_LOGIN_URL = 'https://www.instagram.com/accounts/login/';
const IG_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36';

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
  const [showWebView, setShowWebView] = useState(false);
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const extracting = useRef(false);

  const load = useCallback(async () => {
    const s = await api.getInstagramStatus();
    setStatus(s);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openWebView = async () => {
    if (!CookieManager || !WebView) {
      Alert.alert(
        'Not supported here',
        'Instagram login requires the full installed app. Please use the APK build.'
      );
      return;
    }
    setError(null);
    extracting.current = false;
    await CookieManager.clearAll();
    setShowWebView(true);
    setWebViewLoading(true);
  };

  const handleNavigationChange = async (navState: { url?: string }) => {
    const url = navState.url ?? '';
    const loggedIn =
      url.startsWith('https://www.instagram.com/') &&
      !url.includes('/accounts/login') &&
      !url.includes('/accounts/onetap') &&
      !url.includes('/accounts/emailsignup') &&
      !url.includes('/challenge/') &&
      !url.includes('/accounts/suspended');

    if (!loggedIn || extracting.current) return;
    extracting.current = true;

    try {
      const cookies = await CookieManager.get('https://www.instagram.com');
      const sessionId = cookies['sessionid']?.value;
      const dsUserId = cookies['ds_user_id']?.value;

      if (!sessionId || !dsUserId) {
        // Not fully logged in yet — keep waiting
        extracting.current = false;
        return;
      }

      setShowWebView(false);
      setBusy(true);
      setStatus((s) => ({ ...s, status: 'connecting' }));
      await api.connectInstagramWebView(sessionId, dsUserId);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Connection failed.');
      setStatus((s) => ({ ...s, status: 'disconnected' }));
    } finally {
      setBusy(false);
      extracting.current = false;
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
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Reveal>
          <ScreenHeader title="Connect" />
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
            {error && <Text style={styles.error}>{error}</Text>}

            <PrimaryButton
              label={connected ? 'Reconnect Instagram' : 'Connect with Instagram'}
              onPress={openWebView}
              loading={busy}
              style={{ marginTop: error ? spacing.md : 0 }}
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
                You log in directly on Instagram's page — your password is never seen by FeedFlow.
              </Text>
            </View>
          </GlassCard>
        </Reveal>
      </ScrollView>

      {/* Instagram WebView login modal */}
      <Modal visible={showWebView} animationType="slide" onRequestClose={() => setShowWebView(false)}>
        <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sign in to Instagram</Text>
            <Pressable onPress={() => setShowWebView(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          {webViewLoading && (
            <View style={styles.loader}>
              <ActivityIndicator color={colors.cyan} size="large" />
            </View>
          )}

          {WebView && (
            <WebView
              source={{ uri: IG_LOGIN_URL }}
              userAgent={IG_USER_AGENT}
              onNavigationStateChange={handleNavigationChange}
              onLoadStart={() => setWebViewLoading(true)}
              onLoadEnd={() => setWebViewLoading(false)}
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              style={{ flex: 1 }}
            />
          )}
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg },
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
  error: { color: colors.reduce, ...font.caption, marginBottom: spacing.md },
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
  modalRoot: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
  loader: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: '#fff',
  },
});
