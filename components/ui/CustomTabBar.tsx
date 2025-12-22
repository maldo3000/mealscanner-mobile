import React from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { AnimatedTabIcon } from './AnimatedTabIcon';
import { glassBorder } from '@/constants/Colors';

/** Maps tab route names to SF Symbol icon names */
const ROUTE_ICON_MAP: Record<string, string> = {
  index: 'house',
  journal: 'book',
  log: 'plus',
  recipes: 'book.closed',
  settings: 'person',
};

const INACTIVE_COLOR = 'rgba(255, 255, 255, 0.6)';

interface CustomTabBarProps extends BottomTabBarProps {}

/**
 * Custom floating tab bar with blur effect on iOS
 * Renders a pill-shaped navigation bar at the bottom of the screen
 */
export function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  // Check if tab bar should be hidden (e.g., during camera mode)
  const currentRoute = state.routes[state.index];
  const currentOptions = descriptors[currentRoute.key]?.options;
  const tabBarStyle = currentOptions?.tabBarStyle as Record<string, unknown> | undefined;
  
  const shouldHide = 
    tabBarStyle?.display === 'none' || 
    tabBarStyle?.height === 0 || 
    tabBarStyle?.opacity === 0;
  
  if (shouldHide) {
    return null;
  }

  const handleTabPress = (routeKey: string, routeName: string, routeParams: object | undefined, isFocused: boolean) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName, routeParams);
    }
  };

  const renderTabButtons = () => (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const iconName = ROUTE_ICON_MAP[route.name];
        
        // Skip routes without icons (e.g., hidden routes)
        if (!iconName) return null;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel || options.title || route.name}
            onPress={() => handleTabPress(route.key, route.name, route.params, isFocused)}
            style={styles.tabButton}
          >
            <AnimatedTabIcon
              focused={isFocused}
              color={isFocused ? '#000000' : INACTIVE_COLOR}
              name={iconName}
              size={24}
            />
          </Pressable>
        );
      })}
    </View>
  );

  // iOS uses BlurView for glassmorphism effect
  if (Platform.OS === 'ios') {
    return (
      <View style={styles.container}>
        <BlurView
          tint="dark"
          intensity={20}
          style={[StyleSheet.absoluteFill, styles.blurBackground]}
          pointerEvents="none"
        />
        {renderTabButtons()}
      </View>
    );
  }

  // Android uses solid background
  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFill, styles.androidBackground]} pointerEvents="none" />
      {renderTabButtons()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.select({ ios: 30, default: 24 }),
    left: 20,
    right: 20,
    height: 64,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 9999,
  },
  blurBackground: {
    borderRadius: 32,
    borderWidth: 1,
    borderColor: glassBorder,
    backgroundColor: 'rgba(2, 44, 34, 0.4)',
    overflow: 'hidden',
  },
  androidBackground: {
    borderRadius: 32,
    borderWidth: 1,
    borderColor: glassBorder,
    backgroundColor: 'rgba(2, 44, 34, 0.9)',
  },
  tabBar: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 64,
  },
  tabButton: {
    flex: 1,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

