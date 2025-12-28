import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
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
const MIN_LOADING_TIME = 2000; // 2 seconds

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
    <Stack 
      initialRouteName={session ? "(tabs)" : "(auth)"}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: 300,
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="meal" options={{ headerShown: false }} />
      <Stack.Screen name="recipe" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ headerShown: true }} />
    </Stack>
  );
}

function RootLayoutContent() {
  const { isLoading: isAuthLoading } = useAuth();
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

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const [shouldRenderLoading, setShouldRenderLoading] = useState(true);

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

  // Determine when app is ready (fonts loaded AND minimum time elapsed AND auth check finished)
  const isAppReady = loaded && minTimeElapsed && !isAuthLoading;

  // Trigger fade out when app is ready
  useEffect(() => {
    if (isAppReady) {
      // Small additional delay to ensure the Redirect logic in RootLayoutNav has fired
      // and the stack has started mounting the target screen behind the overlay
      const timer = setTimeout(() => {
        setIsOverlayVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isAppReady]);

  // If fonts aren't loaded yet, show nothing (system splash screen handles this)
  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={theme}>
      <View style={{ flex: 1 }}>
        {/* The actual app navigation renders here immediately behind the overlay */}
        <RootLayoutNav />
        
        {/* The loading screen overlays everything until it's done fading */}
        {ENABLE_LOADING_SCREEN && shouldRenderLoading && (
          <LoadingScreen 
            isVisible={isOverlayVisible} 
            onFadeComplete={() => setShouldRenderLoading(false)}
          />
        )}
        
        <StatusBar style="light" />
      </View>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootLayoutContent />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
