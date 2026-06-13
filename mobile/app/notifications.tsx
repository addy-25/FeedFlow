import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '../components/GradientBackground';
import { GlassCard } from '../components/GlassCard';
import { Reveal } from '../components/Reveal';
import {
  clearNotificationHistory,
  getNotificationHistory,
  type NotifItem,
} from '../lib/notifications';
import { timeAgo } from '../lib/format';
import { colors, font, radii, spacing } from '../theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<NotifItem[]>([]);

  const load = useCallback(() => {
    getNotificationHistory().then(setItems);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const clear = async () => {
    await clearNotificationHistory();
    setItems([]);
  };

  return (
    <GradientBackground>
      <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Notifications</Text>
          {items.length > 0 ? (
            <Pressable onPress={clear} hitSlop={12}>
              <Text style={styles.clear}>Clear</Text>
            </Pressable>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
          showsVerticalScrollIndicator={false}
        >
          {items.length === 0 ? (
            <Reveal style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="notifications-off-outline" size={32} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>
                You'll see a note here each time FeedFlow personalizes your feed.
              </Text>
            </Reveal>
          ) : (
            items.map((item, i) => (
              <Reveal key={item.id} delay={i * 60}>
                <GlassCard style={{ marginTop: spacing.md }}>
                  <View style={styles.row}>
                    <View style={styles.icon}>
                      <Ionicons name="sparkles" size={16} color={colors.cyan} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemBody}>{item.body}</Text>
                      <Text style={styles.itemTime}>{timeAgo(item.ts)}</Text>
                    </View>
                  </View>
                </GlassCard>
              </Reveal>
            ))
          )}
        </ScrollView>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  back: { width: 44 },
  title: { ...font.title, color: colors.text, flex: 1, textAlign: 'center' },
  clear: { ...font.label, color: colors.cyan, width: 44, textAlign: 'right' },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(34,211,238,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { ...font.label, color: colors.text, fontSize: 15 },
  itemBody: { ...font.caption, color: colors.textDim, marginTop: 2, lineHeight: 18 },
  itemTime: { ...font.caption, color: colors.textMuted, marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 120, paddingHorizontal: spacing.xl },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: { ...font.h2, color: colors.text },
  emptySub: { ...font.body, color: colors.textDim, textAlign: 'center', marginTop: spacing.sm, lineHeight: 21 },
});
