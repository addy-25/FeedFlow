/**
 * Animated number that counts up from 0 to `value` on mount.
 * Uses the TextInput animatedProps trick so it never re-renders React.
 */
import { useEffect } from 'react';
import { TextInput, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export function CountUp({
  value,
  duration = 1200,
  delay = 0,
  decimals = 0,
  suffix = '',
  prefix = '',
  style,
}: {
  value: number;
  duration?: number;
  delay?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  style?: StyleProp<TextStyle>;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(value, { duration, easing: Easing.out(Easing.cubic) })
    );
  }, [value, duration, delay, progress]);

  const animatedProps = useAnimatedProps(() => {
    const n = progress.value;
    const formatted = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
    return { text: `${prefix}${formatted}${suffix}`, defaultValue: `${prefix}0${suffix}` } as any;
  });

  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      style={[{ padding: 0 }, style]}
      animatedProps={animatedProps}
    />
  );
}
