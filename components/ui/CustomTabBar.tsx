import React from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { AnimatedTabIcon } from './AnimatedTabIcon';
import { glassBorder } from '@/constants/Colors';

// Map route names to icons
const routeIconMap: Record<string, string> = {
  'index': 'house',
  'journal': 'book',
  'log': 'plus',
  'recipes': 'book.closed',
  'settings': 'person',
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const inactiveColor = 'rgba(255, 255, 255, 0.6)';
  
  // Check if tab bar should be hidden
  const currentRoute = state.routes[state.index];
  const currentOptions = descriptors[currentRoute.key]?.options;
  const tabBarStyle = currentOptions?.tabBarStyle as any;
  const shouldHide = tabBarStyle?.display === 'none' || tabBarStyle?.height === 0 || tabBarStyle?.opacity === 0;
  
  if (shouldHide) {
    return null;
  }

  const tabBarContent = (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }

          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        // Get icon for this route
        const iconName = routeIconMap[route.name];
        if (!iconName) return null;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel || options.title || route.name}
            onPress={onPress}
            style={styles.tabButton}
            activeOpacity={0.7}
          >
            <AnimatedTabIcon
              focused={isFocused}
              color={isFocused ? '#000000' : inactiveColor}
              name={iconName}
              size={24}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.container}>
        <BlurView
          tint="dark"
          intensity={20}
          style={styles.blurContainer}
        >
          {tabBarContent}
        </BlurView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.androidContainer}>
        {tabBarContent}
      </View>
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  blurContainer: {
    flex: 1,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: glassBorder,
    backgroundColor: 'rgba(2, 44, 34, 0.4)',
  },
  androidContainer: {
    flex: 1,
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
    paddingHorizontal: 0,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
    marginVertical: 0,
  },
  tabButton: {
    flex: 1,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginVertical: 0,
    minHeight: 64,
    maxHeight: 64,
  },
});

