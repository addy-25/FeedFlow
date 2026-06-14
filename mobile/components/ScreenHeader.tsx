/**
 * Standard page header: large title on the left, a notification bell on the
 * right that taps through to the in-app notification center. Pass `right` to
 * slot an extra action (e.g. a Reset button) just before the bell.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, spacing } from '../theme';

export function NotificationBell() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push('/notifications')} hitSlop={12}>
      <Ionicons name="notifications-outline" size={22} color={colors.textDim} />
    </Pressable>
  );
}

export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.headerRow}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.actions}>
        {right}
        <NotificationBell />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...font.hero, color: colors.text },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
