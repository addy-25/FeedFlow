import { withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { GlassTabBar } from '../../components/GlassTabBar';
import { colors } from '../../theme';

// expo-router doesn't ship a swipeable tabs navigator, so we adapt
// Material Top Tabs (which supports swipe) and pin its bar to the bottom.
const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

export default function TabsLayout() {
  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        swipeEnabled: true,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <MaterialTopTabs.Screen name="index" options={{ title: 'Home' }} />
      <MaterialTopTabs.Screen name="preferences" options={{ title: 'Interests' }} />
      <MaterialTopTabs.Screen name="connect" options={{ title: 'Connect' }} />
      <MaterialTopTabs.Screen name="analytics" options={{ title: 'Activity' }} />
      <MaterialTopTabs.Screen name="profile" options={{ title: 'Profile' }} />
    </MaterialTopTabs>
  );
}
