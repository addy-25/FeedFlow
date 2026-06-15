/** Frosted glass surface used for every card in the app. */
import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../theme';

export function GlassCard({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.fill, padded && styles.padded]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
  },
  fill: { flex: 0 },
  padded: { padding: spacing.lg },
});
