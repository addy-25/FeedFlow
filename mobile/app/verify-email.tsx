import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../components/GradientBackground';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { Reveal } from '../components/Reveal';
import { useAuth } from '../lib/auth';
import { colors, font, radii, spacing } from '../theme';

const RESEND_COOLDOWN = 30; // seconds between resend requests

export default function VerifyEmail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { verifyEmail, resendVerification } = useAuth();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const email = (emailParam ?? '').trim();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [resent, setResent] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Count down the resend cooldown.
  useEffect(() => {
    timer.current = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const submit = async () => {
    setError(null);
    if (code.trim().length < 4) {
      setError('Enter the code from your email.');
      return;
    }
    setBusy(true);
    try {
      await verifyEmail(email, code.trim());
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message ?? 'Could not verify the code.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setError(null);
    setResent(false);
    try {
      await resendVerification(email);
      setResent(true);
      setCooldown(RESEND_COOLDOWN);
    } catch (e: any) {
      setError(e?.message ?? 'Could not resend the code.');
    }
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
          <Pressable style={styles.back} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>

          <View style={styles.body}>
            <Reveal style={styles.center}>
              <View style={styles.icon}>
                <Ionicons name="mail-unread-outline" size={36} color={colors.cyan} />
              </View>
              <Text style={styles.title}>Verify your email</Text>
              <Text style={styles.sub}>
                We sent a 6-digit code to{' '}
                <Text style={{ color: colors.text }}>{email || 'your email'}</Text>. Enter it below
                to finish creating your account.
              </Text>
            </Reveal>

            <Reveal delay={120} style={{ marginTop: spacing.xl }}>
              <GlassCard>
                <Text style={styles.label}>Verification code</Text>
                <TextInput
                  value={code}
                  onChangeText={setCode}
                  placeholder="123456"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={6}
                  style={[styles.input, styles.codeInput]}
                  autoFocus
                />

                {error && <Text style={styles.error}>{error}</Text>}
                {resent && !error && (
                  <Text style={styles.sent}>A new code is on its way.</Text>
                )}

                <PrimaryButton
                  label="Verify & continue"
                  onPress={submit}
                  loading={busy}
                  style={{ marginTop: spacing.xl }}
                />

                <Pressable
                  onPress={resend}
                  disabled={cooldown > 0}
                  style={styles.resendRow}
                  hitSlop={8}
                >
                  <Text style={[styles.resendText, cooldown > 0 && styles.resendDisabled]}>
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                  </Text>
                </Pressable>
              </GlassCard>
            </Reveal>
          </View>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.xl },
  back: { width: 40, height: 40, justifyContent: 'center' },
  body: { flex: 1, justifyContent: 'center', paddingBottom: 80 },
  center: { alignItems: 'center' },
  icon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.cyan + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: { ...font.hero, color: colors.text, textAlign: 'center' },
  sub: {
    ...font.body,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
  },
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
  codeInput: { letterSpacing: 8, fontSize: 20, textAlign: 'center' },
  error: { color: colors.reduce, ...font.caption, marginTop: spacing.md },
  sent: { color: colors.boost, ...font.caption, marginTop: spacing.md },
  resendRow: { alignSelf: 'center', marginTop: spacing.lg },
  resendText: { ...font.label, color: colors.cyan },
  resendDisabled: { color: colors.textMuted },
});
