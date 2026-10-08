// ─────────────────────────────────────────
// GEARUP — App Entry Point
// ─────────────────────────────────────────
import React from 'react';
import { Provider } from 'react-redux';
import { store } from './src/store';
import RootNavigator from './src/navigation';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
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