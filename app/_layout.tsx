import '../global.css';

import { DarkTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { QueryClientProvider } from '@tanstack/react-query';

import { AppBackground } from '@/components/AppBackground';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingScreen } from '@/components/LoadingScreen';
import { bgPrimary } from '@/constants/Colors';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { queryClient } from '@/lib/queryClient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useFirstLaunch } from '@/hooks/useFirstLaunch';
import { getNotificationRouteFromData, initializeNotifications } from '@/lib/notifications';
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
        // Prevent white flashes during route transitions between transparent pages.
        contentStyle: { backgroundColor: bgPrimary },
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
  const { tokens } = useTheme();
  const router = useRouter();
  
  // Build React Navigation theme from current theme tokens
  // Use transparent background so the global AppBackground shows through
  const navigationTheme = useMemo(() => ({
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: tokens.accent,
      background: 'transparent',
      card: tokens.backgroundAlt,
      text: tokens.textPrimary,
      border: tokens.border,
      notification: tokens.accent,
    },
  }), [tokens]);
  
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

  // Safety valve: force-dismiss the loading screen after 15 seconds no matter what.
  // This prevents the app from being permanently stuck if any async init hangs.
  useEffect(() => {
    if (!shouldRenderLoading) return; // Already dismissed

    const forceTimeout = setTimeout(() => {
      console.warn('⚠️ Loading screen safety timeout (15s) — force dismissing');
      setLoadingAnimationReady(true);
      setIsOverlayVisible(false);
      // Give the fade animation a moment, then unmount
      setTimeout(() => setShouldRenderLoading(false), 700);
    }, 15_000);

    return () => clearTimeout(forceTimeout);
  }, [shouldRenderLoading]);

  useEffect(() => {
    void initializeNotifications();
  }, []);

  useEffect(() => {
    const handleInitialNotification = async () => {
      const initialResponse = await Notifications.getLastNotificationResponseAsync();
      const initialRoute = getNotificationRouteFromData(initialResponse?.notification.request.content.data);
      if (initialRoute) {
        router.push(initialRoute);
      }
    };

    void handleInitialNotification();

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = getNotificationRouteFromData(response.notification.request.content.data);
      if (route) {
        router.push(route);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

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
    <NavigationThemeProvider value={navigationTheme}>
      <View style={{ flex: 1 }}>
        {/* Universal film-grain background with vignette and grain */}
        <AppBackground />
        
        {/* The actual app navigation renders here immediately behind the overlay */}
        <RootLayoutNav />
        
        {/* The loading screen overlays everything until it's done fading */}
        {ENABLE_LOADING_SCREEN && shouldRenderLoading && (
          <LoadingScreen 
            isVisible={isOverlayVisible}
            // Pass `undefined` while checking so startup animation doesn't "lock in" the wrong mode
            isFirstLaunch={isCheckingFirstLaunch ? undefined : isFirstLaunch}
            onReadyToDismiss={handleLoadingReady}
            onFadeComplete={() => setShouldRenderLoading(false)}
          />
        )}
        
        <StatusBar style="light" />
      </View>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <RootLayoutContent />
              </SubscriptionProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
