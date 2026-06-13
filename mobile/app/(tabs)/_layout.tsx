import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StyleSheet, type ColorValue } from 'react-native';
import { colors } from '../../theme';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} size={size} color={color as string} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.cyan,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarBackground: () => (
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        ),
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: tabIcon('home') }}
      />
      <Tabs.Screen
        name="preferences"
        options={{ title: 'Interests', tabBarIcon: tabIcon('options') }}
      />
      <Tabs.Screen
        name="connect"
        options={{ title: 'Connect', tabBarIcon: tabIcon('logo-instagram') }}
      />
      <Tabs.Screen
        name="analytics"
        options={{ title: 'Activity', tabBarIcon: tabIcon('bar-chart') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon('person') }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    borderTopWidth: 0,
    backgroundColor: 'rgba(10,10,20,0.6)',
    elevation: 0,
    height: 84,
    paddingTop: 8,
  },
});
