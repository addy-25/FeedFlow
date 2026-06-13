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
import * as Haptics from 'expo-haptics';
import { GradientBackground } from '../components/GradientBackground';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { Reveal } from '../components/Reveal';
import { api } from '../lib/api';
import { colors, font, radii, spacing } from '../theme';

export default function ChangePassword() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!current || !next) {
      setError('Fill in all fields.');
      return;
    }
    if (next.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (next !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.changePassword(current, next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setError(e?.message ?? 'Could not update password.');
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
              <Text style={styles.title}>Change password</Text>
              <Text style={styles.sub}>Enter your current password, then a new one.</Text>
            </Reveal>

            <Reveal delay={120} style={{ marginTop: spacing.xl }}>
              <GlassCard>
                <Text style={styles.label}>Current password</Text>
                <TextInput
                  value={current}
                  onChangeText={setCurrent}
                  placeholder="••••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  style={styles.input}
                />
                <Text style={[styles.label, { marginTop: spacing.lg }]}>New password</Text>
                <TextInput
                  value={next}
                  onChangeText={setNext}
                  placeholder="••••••••••"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  style={styles.input}
                />
                <Text style={[styles.label, { marginTop: spacing.lg }]}>Confirm new password</Text>
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
                  label="Update password"
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
