import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../src/theme/tokens';
import { useSettingsStore } from '../src/stores/useSettingsStore';

export default function RootLayout() {
  const loadSettings = useSettingsStore((state) => state.load);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      />
    </SafeAreaProvider>
  );
}
