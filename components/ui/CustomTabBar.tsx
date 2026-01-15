import { neonGreen } from '@/constants/Colors';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
    interpolate,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { AnimatedTabIcon } from './AnimatedTabIcon';

/** Maps tab route names to SF Symbol icon names */
const ROUTE_ICON_MAP: Record<string, string> = {
  index: 'house',
  journal: 'book',
  log: 'plus',
  recipes: 'book.closed',
  profile: 'person',
};

const INACTIVE_COLOR = 'rgba(255, 255, 255, 0.5)';
const TAB_BAR_HEIGHT = 72;
const HORIZONTAL_PADDING = 20;

interface CustomTabBarProps extends BottomTabBarProps {
  /** Called when the capture/log button is pressed instead of navigating */
  onCapturePress?: () => void;
}

/**
 * Custom floating tab bar with iOS 18 "Liquid Glass" effect
 * Features a sliding fluid indicator, squishy interactions, and clean glassmorphic styling
 */
export function CustomTabBar({ state, descriptors, navigation, onCapturePress }: CustomTabBarProps) {
  const { width: windowWidth } = useWindowDimensions();
  const tabCount = state.routes.filter(r => ROUTE_ICON_MAP[r.name]).length;
  const containerWidth = windowWidth - (HORIZONTAL_PADDING * 2);
  const tabWidth = containerWidth / tabCount;

  // Animation values
  const activeIndex = useSharedValue(state.index);
  const barScale = useSharedValue(1);
  const pressProgress = useSharedValue(0); 

  // Update active index when state changes with a spring
  useEffect(() => {
    activeIndex.value = withSpring(state.index, {
      damping: 20,
      stiffness: 150,
      mass: 0.8,
    });
  }, [state.index]);

  // Check if tab bar should be hidden
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
    // Provide haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Intercept the log/capture tab to show action sheet instead of navigating
    if (routeName === 'log' && onCapturePress) {
      onCapturePress();
      return;
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

  // Liquid Indicator Style
  const indicatorStyle = useAnimatedStyle(() => {
    const translateX = activeIndex.value * tabWidth;
    
    // Stretch effect logic
    const diff = Math.abs(state.index - activeIndex.value);
    const stretch = interpolate(diff, [0, 0.5, 1], [1, 1.4, 1]); 
    
    // Get active tint color from the current screen's options
    const activeTintColor = descriptors[state.routes[state.index].key]?.options?.tabBarActiveTintColor || neonGreen;
    
    return {
      width: tabWidth * 0.75, 
      height: TAB_BAR_HEIGHT * 0.6,
      backgroundColor: activeTintColor,
      shadowColor: activeTintColor,
      transform: [
        { translateX: translateX + (tabWidth * 0.125) },
        { scaleX: stretch },
      ],
    };
  });

  // Squishy Bar & Clean Glassmorphic Style
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: barScale.value }],
    shadowOpacity: interpolate(pressProgress.value, [0, 1], [0.5, 0.3]),
    shadowRadius: interpolate(pressProgress.value, [0, 1], [15, 8]),
    borderColor: interpolateColor(
      pressProgress.value,
      [0, 1],
      ['rgba(255, 255, 255, 0.12)', neonGreen]
    ),
  }));

  const onTouchStart = () => {
    barScale.value = withSpring(0.95);
    pressProgress.value = withSpring(1);
  };

  const onTouchEnd = () => {
    barScale.value = withSpring(1);
    pressProgress.value = withSpring(0);
  };

  const renderTabButtons = () => (
    <View style={styles.tabBar}>
      {/* Liquid Indicator Bubble */}
      <Animated.View style={[styles.indicator, indicatorStyle]} pointerEvents="none" />
      
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const iconName = ROUTE_ICON_MAP[route.name];
        
        if (!iconName) return null;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel || options.title || route.name}
            onPress={() => handleTabPress(route.key, route.name, route.params, isFocused)}
            onPressIn={onTouchStart}
            onPressOut={onTouchEnd}
            style={styles.tabButton}
          >
            <AnimatedTabIcon
              focused={isFocused}
              color={isFocused ? (options.tabBarActiveTintColor || '#000000') : INACTIVE_COLOR}
              name={iconName}
              size={24}
            />
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      {Platform.OS === 'ios' ? (
        <BlurView
          tint="dark"
          intensity={35}
          style={[StyleSheet.absoluteFill, styles.blurBackground]}
          pointerEvents="none"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidBackground]} pointerEvents="none" />
      )}
      {renderTabButtons()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.select({ ios: 34, default: 24 }),
    left: HORIZONTAL_PADDING,
    right: HORIZONTAL_PADDING,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: 1,
    // Translucent - let the blur show through
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
    zIndex: 9999,
  },
  blurBackground: {
    borderRadius: (TAB_BAR_HEIGHT - 2) / 2,
    overflow: 'hidden',
  },
  androidBackground: {
    borderRadius: TAB_BAR_HEIGHT / 2,
    backgroundColor: 'rgba(2, 44, 34, 0.95)',
  },
  tabBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  indicator: {
    position: 'absolute',
    borderRadius: (TAB_BAR_HEIGHT * 0.6) / 2,
    zIndex: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
});
