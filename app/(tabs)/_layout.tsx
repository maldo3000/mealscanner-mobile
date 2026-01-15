import { Slot, Tabs, usePathname, useRouter } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { AnimatedTabIcon } from '@/components/ui/AnimatedTabIcon';
import { CustomTabBar } from '@/components/ui/CustomTabBar';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { CaptureActionSheet } from '@/components/capture/CaptureActionSheet';
import { GlobalCaptureController } from '@/components/capture/GlobalCaptureController';
import { Colors, bgPrimary } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';

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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const isActive = (href: string) => {
    if (href === '/(tabs)/') {
      return pathname === '/(tabs)/' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <View style={[styles.container, { backgroundColor: bgPrimary }]}>
      {/* Sidebar */}
      <View style={[styles.sidebar, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
        {/* Logo/Header */}
        <View style={styles.sidebarHeader}>
          <BrandLogo size="lg" textColor={colors.text} />
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
                  active && { backgroundColor: colors.tint + '15' }
                ]}
                onPress={() => router.push(item.href as any)}
              >
                <IconSymbol 
                  name={item.icon as any}
                  size={20} 
                  color={active ? colors.tint : colors.icon} 
                />
                <Text style={[
                  TextStyles.body,
                  { 
                    color: active ? colors.tint : colors.text,
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
        <View style={styles.sidebarFooter}>
          <View style={styles.versionInfo}>
            <BrandLogo size="sm" textColor={colors.icon} />
            <Text style={[TextStyles.bodySmall, { color: colors.icon, marginTop: 4 }]}>
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

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [captureSheetVisible, setCaptureSheetVisible] = useState(false);
  const [captureAction, setCaptureAction] = useState<'snap' | 'describe' | 'log' | 'recipe' | null>(null);
  const [isCaptureVisible, setIsCaptureVisible] = useState(false);

  // Handle capture action selection from the action sheet
  const handleCaptureAction = useCallback((action: 'snap' | 'describe' | 'log' | 'recipe') => {
    setCaptureSheetVisible(false);
    setCaptureAction(action);
    setIsCaptureVisible(true);
  }, []);

  const handleOpenCaptureSheet = useCallback(() => {
    setCaptureSheetVisible(true);
  }, []);

  const handleCloseCaptureSheet = useCallback(() => {
    setCaptureSheetVisible(false);
  }, []);

  const handleCloseCapture = useCallback(() => {
    setCaptureAction(null);
    setIsCaptureVisible(false);
  }, []);

  // Use sidebar layout on web, bottom tabs on mobile
  if (Platform.OS === 'web') {
    return <SidebarLayout />;
  }

  return (
    <>
      <Tabs
        tabBar={(props) => (
          <CustomTabBar {...props} onCapturePress={handleOpenCaptureSheet} />
        )}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
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
        <Tabs.Screen
          name="auth"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* Capture Action Sheet Overlay */}
      <CaptureActionSheet
        visible={captureSheetVisible}
        onClose={handleCloseCaptureSheet}
        onSnap={() => handleCaptureAction('snap')}
        onDescribe={() => handleCaptureAction('describe')}
        onLog={() => handleCaptureAction('log')}
        onCaptureRecipe={() => handleCaptureAction('recipe')}
      />

      {/* Global Capture Controller Overlay */}
      <GlobalCaptureController
        activeAction={captureAction}
        isVisible={isCaptureVisible}
        onClose={handleCloseCapture}
      />
    </>
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
    borderBottomColor: 'rgba(107, 114, 128, 0.1)',
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
    borderTopColor: 'rgba(107, 114, 128, 0.1)',
  },
  versionInfo: {
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
});
