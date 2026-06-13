import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../components/GradientBackground';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { Reveal } from '../components/Reveal';
import { api } from '../lib/api';
import { colors, font, radii, spacing } from '../theme';

export default function ForgotPassword() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and a new password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.resetPassword(email.trim(), password);
      setDone(true);
    } catch (e: any) {
      setError(e?.message ?? 'Could not reset password.');
    } finally {
      setBusy(false);
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

          {done ? (
            <Reveal style={styles.center}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={40} color={colors.boost} />
              </View>
              <Text style={styles.title}>Password reset</Text>
              <Text style={styles.sub}>
                Your password has been updated. You can now sign in with it.
              </Text>
              <PrimaryButton
                label="Back to sign in"
                onPress={() => router.replace('/login')}
                style={{ marginTop: spacing.xxl, width: '100%' }}
              />
            </Reveal>
          ) : (
            <View style={styles.body}>
              <Reveal>
                <Text style={styles.title}>Reset password</Text>
                <Text style={styles.sub}>
                  Enter the email for your account and choose a new password.
                </Text>
              </Reveal>

              <Reveal delay={120} style={{ marginTop: spacing.xl }}>
                <GlassCard>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                  />
                  <Text style={[styles.label, { marginTop: spacing.lg }]}>New password</Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••••"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    style={styles.input}
                  />
                  <Text style={[styles.label, { marginTop: spacing.lg }]}>Confirm password</Text>
                  <TextInput
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholder="••••••••••"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    style={styles.input}
                  />

                  {error && <Text style={styles.error}>{error}</Text>}

                  <PrimaryButton
                    label="Reset password"
                    onPress={submit}
                    loading={busy}
                    style={{ marginTop: spacing.xl }}
                  />
                </GlassCard>
              </Reveal>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.xl },
  back: { width: 40, height: 40, justifyContent: 'center' },
  body: { flex: 1, justifyContent: 'center', paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  successIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.boost + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: { ...font.hero, color: colors.text, textAlign: 'center' },
  sub: { ...font.body, color: colors.textDim, textAlign: 'center', marginTop: spacing.sm, lineHeight: 21 },
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
});
