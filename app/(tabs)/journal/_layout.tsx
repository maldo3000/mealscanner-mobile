import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors, primaryGreen } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function JournalTabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: primaryGreen,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].icon,
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
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
          borderTopColor: Colors[colorScheme ?? 'light'].border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Meals',
          tabBarIcon: ({ color }) => <IconSymbol size={22} name="fork.knife" color={color} />,
        }}
      />
    </Tabs>
  );
}


