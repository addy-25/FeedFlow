/**
 * Interest "globe": a glowing core wrapped in tilted orbital rings that spin
 * continuously, with luminous nodes riding each ring. Pure SVG + Reanimated —
 * the visual centrepiece of the Preferences screen, with zero WebGL fragility.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../theme';

function Ring({
  size,
  rx,
  ry,
  baseRotation,
  duration,
  direction,
  color,
}: {
  size: number;
  rx: number;
  ry: number;
  baseRotation: number;
  duration: number;
  direction: 1 | -1;
  color: string;
}) {
  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withRepeat(
      withTiming(360 * direction, { duration, easing: Easing.linear }),
      -1,
      false
    );
  }, [duration, direction, rot]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${baseRotation + rot.value}deg` }],
  }));

  const cx = size / 2;
  const cy = size / 2;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={size} height={size}>
        <Ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          stroke={color}
          strokeWidth={1.4}
          strokeOpacity={0.55}
          fill="none"
        />
        {/* two luminous nodes riding the ring */}
        <Circle cx={cx + rx} cy={cy} r={4.5} fill={color} />
        <Circle cx={cx - rx} cy={cy} r={3} fill={colors.violetSoft} />
      </Svg>
    </Animated.View>
  );
}

export function Globe({ size = 230 }: { size?: number }) {
  const cx = size / 2;
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [pulse]);
  const coreStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + pulse.value * 0.3,
    transform: [{ scale: 0.95 + pulse.value * 0.1 }],
  }));

  const rx = size * 0.42;
  const ry = size * 0.17;

  return (
    <View style={{ width: size, height: size }}>
      {/* glowing core */}
      <Animated.View style={[StyleSheet.absoluteFill, coreStyle]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="core" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.cyan} stopOpacity={0.9} />
              <Stop offset="0.45" stopColor={colors.violet} stopOpacity={0.5} />
              <Stop offset="1" stopColor={colors.violet} stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id="sphere" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.violetSoft} stopOpacity={0.4} />
              <Stop offset="1" stopColor={colors.blue} stopOpacity={0.15} />
            </LinearGradient>
          </Defs>
          <Circle cx={cx} cy={cx} r={size * 0.34} fill="url(#core)" />
          <Circle
            cx={cx}
            cy={cx}
            r={size * 0.26}
            fill="url(#sphere)"
            stroke={colors.glassStrong}
            strokeWidth={1}
          />
        </Svg>
      </Animated.View>

      {/* orbital rings */}
      <Ring size={size} rx={rx} ry={ry} baseRotation={0} duration={14000} direction={1} color={colors.cyan} />
      <Ring size={size} rx={rx} ry={ry} baseRotation={60} duration={18000} direction={-1} color={colors.violetSoft} />
      <Ring size={size} rx={rx} ry={ry} baseRotation={120} duration={22000} direction={1} color={colors.blue} />
    </View>
  );
}
