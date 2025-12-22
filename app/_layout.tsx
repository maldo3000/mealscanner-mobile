import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../global.css';

import { LoadingScreen } from '@/components/LoadingScreen';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import {
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
} from '@expo-google-fonts/source-sans-3';

// Feature flag to easily disable loading screen
// Set to false to disable the loading screen
const ENABLE_LOADING_SCREEN = true;

// Minimum time to show loading screen (in milliseconds)
const MIN_LOADING_TIME = 5000; // 5 seconds

function RootLayoutNav() {
  const { session, isLoading: isAuthLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isAuthLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Redirect to the sign-in page if no session and not already in auth group
      router.replace('/(auth)');
    } else if (session && inAuthGroup) {
      // Redirect away from the sign-in page if logged in
      router.replace('/(tabs)');
    }
  }, [session, isAuthLoading, segments]);

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="meal" options={{ headerShown: false }} />
      <Stack.Screen name="recipe" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Always use dark theme to match mobile experience  
  const theme = DarkTheme;
  
  const [loaded] = useFonts({
    // Telegraf for headings (local asset files)
    Telegraf_800UltraBold: require('../assets/fonts/Telegraf UltraBold 800.otf'),
    Telegraf_400Regular: require('../assets/fonts/TelegrafRegular_272984568a25d8528fe2de8b20b29011.otf'),
    
    // Source Sans 3 for body + UI text
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
    
    // Keep existing SpaceMono
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [isAppReady, setIsAppReady] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Track minimum display time
  useEffect(() => {
    if (ENABLE_LOADING_SCREEN) {
      const timer = setTimeout(() => {
        setMinTimeElapsed(true);
      }, MIN_LOADING_TIME);

      return () => clearTimeout(timer);
    } else {
      setMinTimeElapsed(true);
    }
  }, []);

  // Determine when app is ready (fonts loaded AND minimum time elapsed)
  useEffect(() => {
    if (loaded && minTimeElapsed) {
      setIsAppReady(true);
    }
  }, [loaded, minTimeElapsed]);

  // Show loading screen if enabled and app is not ready
  if (ENABLE_LOADING_SCREEN && !isAppReady) {
    return (
      <>
        <LoadingScreen />
        <StatusBar style="light" />
      </>
    );
  }

  // If loading screen is disabled, show nothing while fonts load
  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider value={theme}>
          <RootLayoutNav />
          <StatusBar style="light" />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
