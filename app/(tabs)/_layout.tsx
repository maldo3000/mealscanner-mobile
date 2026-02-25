import { Slot, Tabs, usePathname, useRouter } from 'expo-router';
import React, { Suspense, lazy, useCallback } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CaptureActionSheet } from '@/components/capture/CaptureActionSheet';
import { AnimatedTabIcon } from '@/components/ui/AnimatedTabIcon';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { CustomTabBar } from '@/components/ui/CustomTabBar';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { SwirlingSpinner } from '@/components/ui/SwirlingSpinner';
import { TextStyles } from '@/constants/Typography';
import { CaptureProvider, useCapture } from '@/context/CaptureContext';
import { useTheme } from '@/context/ThemeContext';

const LazyGlobalCaptureController = lazy(async () => {
  const mod = await import('@/components/capture/GlobalCaptureController');
  return { default: mod.GlobalCaptureController };
});

const navigationItems = [
  {
    name: 'log',
    title: 'Capture',
    icon: 'plus',
    href: '/(tabs)/log',
    isCapture: true
  },
  {
    name: 'index',
    title: 'Home',
    icon: 'house',
    href: '/(tabs)/'
  },
  {
    name: 'journal',
    title: 'Journal',
    icon: 'book',
    href: '/(tabs)/journal'
  },
  {
    name: 'recipes',
    title: 'Recipes',
    icon: 'book.closed',
    href: '/(tabs)/recipes'
  },
  {
    name: 'profile',
    title: 'Profile',
    icon: 'person.circle',
    href: '/(tabs)/profile'
  }
];

function SidebarLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { tokens, accentAlpha } = useTheme();

  const isActive = (href: string) => {
    if (href === '/(tabs)/') {
      return pathname === '/(tabs)/' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <View style={[styles.container, { backgroundColor: tokens.background }]}>
      {/* Sidebar */}
      <View style={[styles.sidebar, { backgroundColor: tokens.glassSurface, borderRightColor: tokens.border }]}>
        {/* Logo/Header */}
        <View style={[styles.sidebarHeader, { borderBottomColor: tokens.borderSubtle }]}>
          <BrandLogo size="lg" textColor={tokens.textPrimary} />
        </View>

        {/* Navigation Items */}
        <View style={styles.navigation}>
          {navigationItems.map((item) => {
            const active = isActive(item.href);
            
            return (
              <TouchableOpacity
                key={item.name}
                style={[
                  styles.navItem,
                  active && { backgroundColor: accentAlpha(0.15) }
                ]}
                onPress={() => router.push(item.href as any)}
              >
                <IconSymbol 
                  name={item.icon as any}
                  size={20} 
                  color={active ? tokens.accent : tokens.textMuted} 
                />
                <Text style={[
                  TextStyles.body,
                  { 
                    color: active ? tokens.accent : tokens.textPrimary,
                    fontWeight: active ? '600' : '400'
                  }
                ]}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer */}
        <View style={[styles.sidebarFooter, { borderTopColor: tokens.borderSubtle }]}>
          <View style={styles.versionInfo}>
            <BrandLogo size="sm" textColor={tokens.textMuted} />
            <Text style={[TextStyles.bodySmall, { color: tokens.textMuted, marginTop: 4 }]}>
              v0.1
            </Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

function TabLayoutContent() {
  const { tokens } = useTheme();
  const router = useRouter();
  const {
    isCaptureSheetVisible,
    openCaptureSheet,
    closeCaptureSheet,
    captureAction,
    setCaptureAction,
    isCaptureVisible,
    setIsCaptureVisible,
  } = useCapture();

  // Handle capture action selection from the action sheet
  const handleCaptureAction = useCallback((action: 'snap' | 'describe' | 'log' | 'recipe') => {
    // Mount the capture controller FIRST so it renders behind the action sheet
    setCaptureAction(action);
    setIsCaptureVisible(true);
    // Delay closing the action sheet so the capture screen has time to mount
    // and render its content, preventing a brief flash of the underlying screen
    setTimeout(() => {
      closeCaptureSheet();
    }, 250);
  }, [closeCaptureSheet, setCaptureAction, setIsCaptureVisible]);

  const handleCloseCapture = useCallback(() => {
    setCaptureAction(null);
    setIsCaptureVisible(false);
  }, [setCaptureAction, setIsCaptureVisible]);

  // Clear only the action after the controller has processed it.
  // The controller stays mounted via isCaptureVisible, but activeAction
  // resets to null so the same action can be triggered again.
  const handleActionProcessed = useCallback(() => {
    setCaptureAction(null);
  }, [setCaptureAction]);

  const shouldMountCaptureController = isCaptureVisible || captureAction !== null;

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar {...props} onCapturePress={openCaptureSheet} />
        )}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          sceneStyle: { backgroundColor: 'transparent' },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon focused={focused} color={color} name="house" />
            ),
          }}
        />
        <Tabs.Screen
          name="journal"
          options={{
            title: 'Journal',
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon focused={focused} color={color} name="book" />
            ),
          }}
        />
        <Tabs.Screen
          name="log"
          options={{
            title: 'Capture',
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon focused={focused} color={color} name="plus" size={24} />
            ),
          }}
        />
        <Tabs.Screen
          name="recipes"
          options={{
            title: 'Recipes',
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon focused={focused} color={color} name="book.closed" />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon focused={focused} color={color} name="person" />
            ),
          }}
        />
      </Tabs>

      {/* Capture Action Sheet Overlay */}
      {isCaptureSheetVisible && (
        <CaptureActionSheet
          visible={isCaptureSheetVisible}
          onClose={closeCaptureSheet}
          onSnap={() => handleCaptureAction('snap')}
          onDescribe={() => handleCaptureAction('describe')}
          onLog={() => handleCaptureAction('log')}
          onCaptureRecipe={() => {
            closeCaptureSheet();
            router.push('/(tabs)/recipes');
          }}
        />
      )}

      {/* Global Capture Controller Overlay */}
      {shouldMountCaptureController && (
        <Suspense
          fallback={
            <View style={[styles.captureFallback, { backgroundColor: tokens.background }]} pointerEvents="auto">
              <SwirlingSpinner size="large" color={tokens.accent} />
            </View>
          }
        >
          <LazyGlobalCaptureController
            activeAction={captureAction}
            isVisible={isCaptureVisible}
            onClose={handleCloseCapture}
            onActionProcessed={handleActionProcessed}
          />
        </Suspense>
      )}
    </>
  );
}

export default function TabLayout() {
  // Use sidebar layout on web, bottom tabs on mobile
  if (Platform.OS === 'web') {
    return <SidebarLayout />;
  }

  return (
    <CaptureProvider>
      <TabLayoutContent />
    </CaptureProvider>
  );
}

const styles = StyleSheet.create({
  // ... existing sidebar styles ...
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 280,
    borderRightWidth: 1,
    flexDirection: 'column',
  },
  sidebarHeader: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
  },
  navigation: {
    flex: 1,
    paddingVertical: 16,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginHorizontal: 12,
    borderRadius: 8,
    cursor: 'pointer',
    // @ts-ignore - web-only property
    transition: 'background-color 0.2s',
  },
  sidebarFooter: {
    padding: 24,
    borderTopWidth: 1,
  },
  versionInfo: {
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  captureFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
});
