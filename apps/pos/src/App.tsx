import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './navigation/AppNavigator';
import { useAuthStore } from './stores/authStore';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { colors } from './config/theme';

const navTheme = {
  dark: true,
  colors: {
    primary: colors.primary,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.error,
  },
};

export default function App() {
  const loadSession = useAuthStore((s) => s.loadSession);
  const restaurant = useAuthStore((s) => s.restaurant);

  // Boot: load existing session
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Realtime: subscribe to restaurant changes
  useRealtimeSync(restaurant?.id);

  // Network: watch connectivity for offline mode
  useNetworkStatus();

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <NavigationContainer theme={navTheme}>
        <AppNavigator />
      </NavigationContainer>
    </>
  );
}
