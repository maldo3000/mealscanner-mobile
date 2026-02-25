import '../global.css';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LoadingScreen } from '@/components/LoadingScreen';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useFirstLaunch } from '@/hooks/useFirstLaunch';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { USE_EDITORIAL_HERBARIUM } from '@/constants/brandExperiment';
import { herbarium } from '@/constants/Colors';
import {
  SourceSans3_400Regular,
  SourceSans3_600SemiBold,
} from '@expo-google-fonts/source-sans-3';

// Feature flag to easily disable loading screen
// Set to false to disable the loading screen
const ENABLE_LOADING_SCREEN = true;

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
  const { isFirstLaunch, isChecking: isCheckingFirstLaunch } = useFirstLaunch();
  const colorScheme = useColorScheme();
  // Always use dark theme to match mobile experience  
  const theme = USE_EDITORIAL_HERBARIUM ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: herbarium.accentPrimary,
      background: herbarium.backgroundInk,
      card: herbarium.backgroundInkAlt,
      text: herbarium.textPrimary,
      border: herbarium.border,
      notification: herbarium.accentPrimary,
    },
  } : DarkTheme;
  
  const [loaded] = useFonts({
    // Telegraf for headings (local asset files)
    Telegraf_800UltraBold: require('../assets/fonts/Telegraf-UltraBold-800.otf'),
    Telegraf_400Regular: require('../assets/fonts/TelegrafRegular_272984568a25d8528fe2de8b20b29011.otf'),
    
    // Source Sans 3 for body + UI text
    SourceSans3_400Regular,
    SourceSans3_600SemiBold,
    
    // Keep existing SpaceMono
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const [shouldRenderLoading, setShouldRenderLoading] = useState(true);
  const [loadingAnimationReady, setLoadingAnimationReady] = useState(false);

  // Callback when the loading screen's internal animation completes
  const handleLoadingReady = useCallback(() => {
    setLoadingAnimationReady(true);
  }, []);

  // Determine when app is ready (fonts loaded AND auth check finished AND first-launch check finished)
  const isAppReady = loaded && !isAuthLoading && !isCheckingFirstLaunch;

  // Trigger fade out when BOTH app is ready AND loading animation has completed
  useEffect(() => {
    if (isAppReady && loadingAnimationReady) {
      // Small additional delay to ensure the Redirect logic in RootLayoutNav has fired
      // and the stack has started mounting the target screen behind the overlay
      const timer = setTimeout(() => {
        setIsOverlayVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isAppReady, loadingAnimationReady]);

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
            isFirstLaunch={isFirstLaunch}
            onReadyToDismiss={handleLoadingReady}
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
        <SubscriptionProvider>
          <RootLayoutContent />
        </SubscriptionProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
