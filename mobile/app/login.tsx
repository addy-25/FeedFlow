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
import { GradientBackground } from '../components/GradientBackground';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { Reveal } from '../components/Reveal';
import { useAuth } from '../lib/auth';
import { colors, font, radii, spacing } from '../theme';

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong.');
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
        <View style={[styles.root, { paddingTop: insets.top + 40, paddingBottom: insets.bottom }]}>
          <Reveal>
            <Text style={styles.brand}>
              Feed<Text style={{ color: colors.cyan }}>Flow</Text>
            </Text>
            <Text style={styles.welcome}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </Text>
            <Text style={styles.sub}>
              {mode === 'login' ? 'Sign in to continue' : 'Start personalizing your feed'}
            </Text>
          </Reveal>

          <Reveal delay={120} style={{ marginTop: spacing.xxl }}>
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
              <Text style={[styles.label, { marginTop: spacing.lg }]}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                style={styles.input}
              />

              {mode === 'login' && (
                <Pressable
                  onPress={() => router.push('/forgot-password')}
                  style={styles.forgotRow}
                  hitSlop={8}
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              )}

              {error && <Text style={styles.error}>{error}</Text>}

              <PrimaryButton
                label={mode === 'login' ? 'Sign In' : 'Create Account'}
                onPress={submit}
                loading={busy}
                style={{ marginTop: spacing.xl }}
              />
            </GlassCard>
          </Reveal>

          <Reveal delay={240}>
            <Pressable
              onPress={() => {
                setError(null);
                setMode((m) => (m === 'login' ? 'register' : 'login'));
              }}
              style={styles.switchRow}
            >
              <Text style={styles.switchText}>
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <Text style={{ color: colors.cyan, fontWeight: '700' }}>
                  {mode === 'login' ? 'Register' : 'Sign in'}
                </Text>
              </Text>
            </Pressable>
          </Reveal>
        </View>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'center' },
  brand: { ...font.title, color: colors.text, textAlign: 'center' },
  welcome: { ...font.hero, color: colors.text, textAlign: 'center', marginTop: spacing.xl },
  sub: { ...font.body, color: colors.textDim, textAlign: 'center', marginTop: spacing.sm },
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
  forgotRow: { alignSelf: 'flex-end', marginTop: spacing.md },
  forgotText: { ...font.label, color: colors.cyan },
  switchRow: { marginTop: spacing.xl, alignItems: 'center' },
  switchText: { ...font.body, color: colors.textDim },
});
