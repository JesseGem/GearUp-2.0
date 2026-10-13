// ─────────────────────────────────────────
// GEARUP — App Entry Point
// ─────────────────────────────────────────
import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './src/store';
import RootNavigator from './src/navigation';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { FONT_FAMILY } from './src/constants';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch((error: unknown) => {
    console.error('Failed to keep the native splash screen visible while fonts load.', error);
  });
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    [FONT_FAMILY.body]: Inter_400Regular,
    [FONT_FAMILY.bodyMedium]: Inter_500Medium,
    [FONT_FAMILY.bodySemiBold]: Inter_600SemiBold,
    [FONT_FAMILY.bodyBold]: Inter_700Bold,
    [FONT_FAMILY.heading]: SpaceGrotesk_500Medium,
    [FONT_FAMILY.headingBold]: SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    if (fontError) console.error('Failed to load GearUp brand fonts.', fontError);
    if (Platform.OS !== 'web') {
      SplashScreen.hideAsync().catch((error: unknown) => {
        console.error('Failed to hide the native splash screen.', error);
      });
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <StatusBar style="auto" />
          <RootNavigator />
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}