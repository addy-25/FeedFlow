import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { GradientBackground } from '../components/GradientBackground';
import { colors } from '../theme';

export default function Index() {
  const { ready, signedIn } = useAuth();

  if (!ready) {
    return (
      <GradientBackground>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.cyan} size="large" />
        </View>
      </GradientBackground>
    );
  }

  return <Redirect href={signedIn ? '/(tabs)' : '/onboarding'} />;
}
