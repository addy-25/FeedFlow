/**
 * Full-screen gradient backdrop with two slowly drifting glow orbs.
 * Gives every screen an ambient, "alive" feel without any heavy WebGL.
 */
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, gradients } from '../theme';

function Orb({
  color,
  size,
  style,
  delay = 0,
}: {
  color: string;
  size: number;
  style: ViewStyle;
  delay?: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 9000 + delay, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [delay, t]);

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateX: (t.value - 0.5) * 60 },
      { translateY: (t.value - 0.5) * 80 },
      { scale: 1 + t.value * 0.15 },
    ],
    opacity: 0.35 + t.value * 0.2,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
        animated,
      ]}
    />
  );
}

export function GradientBackground({ children }: { children: ReactNode }) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={gradients.screen}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <Orb color={colors.violet} size={320} style={{ top: -120, left: -90 }} />
      <Orb color={colors.blue} size={280} style={{ bottom: -80, right: -80 }} delay={2400} />
      <Orb color={colors.cyan} size={180} style={{ top: '38%', right: -60 }} delay={1200} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
});
