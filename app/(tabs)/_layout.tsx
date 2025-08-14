import { Slot, Tabs, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
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
    icon: 'fork.knife',
    href: '/(tabs)/recipes'
  },
  {
    name: 'settings',
    title: 'Profile',
    icon: 'person.circle',
    href: '/(tabs)/settings'
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sidebar */}
      <View style={[styles.sidebar, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>
        {/* Logo/Header */}
        <View style={styles.sidebarHeader}>
          <View style={[styles.logoContainer, { backgroundColor: colors.tint }]}>
            <IconSymbol name="fork.knife" size={24} color="white" />
          </View>
          <Text style={[TextStyles.h3, { color: colors.text }]}>MealScanner</Text>
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
            <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
              MealScanner v0.1
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

  // Use sidebar layout on web, bottom tabs on mobile
  if (Platform.OS === 'web') {
    return <SidebarLayout />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarLabelStyle: {
          fontFamily: Platform.OS === 'web' 
            ? "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
            : 'SpaceGrotesk_400Regular',
          fontSize: 12,
          fontWeight: Platform.OS === 'web' ? '400' : 'normal',
        },
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
            height: 90,
            paddingBottom: 10,
          },
          default: {
            height: 90,
            paddingBottom: 10,
          },
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house" color={color} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Capture',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.mobileTabCaptureContainer}>
              <View style={[
                styles.mobileTabCapture,
                { 
                  backgroundColor: Colors[colorScheme ?? 'light'].tint,
                  transform: [{ scale: focused ? 1.1 : 1.0 }]
                }
              ]}>
                <IconSymbol size={26} name="plus" color="white" />
              </View>
            </View>
          ),
          tabBarLabel: ({ focused }) => (
            <Text style={[
              styles.mobileTabCaptureLabel,
              { color: Colors[colorScheme ?? 'light'].tint }
            ]}>
              Capture
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="fork.knife" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="auth"
        options={{
          href: null, // Hide from tab bar but keep the route accessible
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
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
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
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
  captureNavItem: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  captureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  captureText: {
    textAlign: 'center',
    fontSize: 12,
  },
  mobileTabCaptureContainer: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    height: 70,
    marginTop: -20,
  },
  mobileTabCapture: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
    marginBottom: 6,
    borderWidth: 3,
    borderColor: 'white',
  },
  mobileTabCaptureLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
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
