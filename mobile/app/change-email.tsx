import { useEffect, useState } from 'react';
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
import * as Haptics from 'expo-haptics';
import { GradientBackground } from '../components/GradientBackground';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { Reveal } from '../components/Reveal';
import { api } from '../lib/api';
import { isValidEmail } from '../lib/validation';
import { colors, font, radii, spacing } from '../theme';

export default function ChangeEmail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [current, setCurrent] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getMe().then((me) => setCurrent(me.email)).catch(() => {});
  }, []);

  const submit = async () => {
    setError(null);
    const next = email.trim();
    if (!next) {
      setError('Enter a new email address.');
      return;
    }
    if (!isValidEmail(next)) {
      setError('Enter a valid email address.');
      return;
    }
    if (next === current) {
      setError('That is already your email.');
      return;
    }
    setBusy(true);
    try {
      await api.changeEmail(next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setError(e?.message ?? 'Could not update email.');
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

          <View style={styles.body}>
            <Reveal>
              <Text style={styles.title}>Change email</Text>
              <Text style={styles.sub}>This is the email you use to sign in.</Text>
            </Reveal>

            <Reveal delay={120} style={{ marginTop: spacing.xl }}>
              <GlassCard>
                <Text style={styles.label}>Current email</Text>
                <View style={styles.currentBox}>
                  <Ionicons name="mail" size={16} color={colors.textDim} />
                  <Text style={styles.currentText}>{current ?? '…'}</Text>
                </View>

                <Text style={[styles.label, { marginTop: spacing.lg }]}>New email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="new@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  style={styles.input}
                />

                {error && <Text style={styles.error}>{error}</Text>}

                <PrimaryButton
                  label="Update email"
                  onPress={submit}
                  loading={busy}
                  style={{ marginTop: spacing.xl }}
                />
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
  title: { ...font.hero, color: colors.text },
  sub: { ...font.body, color: colors.textDim, marginTop: spacing.sm },
  label: { ...font.label, color: colors.textDim, marginBottom: spacing.sm },
  currentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    height: 48,
  },
  currentText: { ...font.body, color: colors.text },
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
