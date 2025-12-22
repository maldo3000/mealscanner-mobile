import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SpriteAnimation } from '@/components/ui/SpriteAnimation';
import { bgPrimary, neonGreen, textMuted } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';

// Import all 27 sprite frames
// Using relative paths since React Native's require() doesn't support TypeScript path aliases
const spriteFrames = [
  require('../assets/images/loading-animation/ezgif-frame-001.png'),
  require('../assets/images/loading-animation/ezgif-frame-002.png'),
  require('../assets/images/loading-animation/ezgif-frame-003.png'),
  require('../assets/images/loading-animation/ezgif-frame-004.png'),
  require('../assets/images/loading-animation/ezgif-frame-005.png'),
  require('../assets/images/loading-animation/ezgif-frame-006.png'),
  require('../assets/images/loading-animation/ezgif-frame-007.png'),
  require('../assets/images/loading-animation/ezgif-frame-008.png'),
  require('../assets/images/loading-animation/ezgif-frame-009.png'),
  require('../assets/images/loading-animation/ezgif-frame-010.png'),
  require('../assets/images/loading-animation/ezgif-frame-011.png'),
  require('../assets/images/loading-animation/ezgif-frame-012.png'),
  require('../assets/images/loading-animation/ezgif-frame-013.png'),
  require('../assets/images/loading-animation/ezgif-frame-014.png'),
  require('../assets/images/loading-animation/ezgif-frame-015.png'),
  require('../assets/images/loading-animation/ezgif-frame-016.png'),
  require('../assets/images/loading-animation/ezgif-frame-017.png'),
  require('../assets/images/loading-animation/ezgif-frame-018.png'),
  require('../assets/images/loading-animation/ezgif-frame-019.png'),
  require('../assets/images/loading-animation/ezgif-frame-020.png'),
  require('../assets/images/loading-animation/ezgif-frame-021.png'),
  require('../assets/images/loading-animation/ezgif-frame-022.png'),
  require('../assets/images/loading-animation/ezgif-frame-023.png'),
  require('../assets/images/loading-animation/ezgif-frame-024.png'),
  require('../assets/images/loading-animation/ezgif-frame-025.png'),
  require('../assets/images/loading-animation/ezgif-frame-026.png'),
  require('../assets/images/loading-animation/ezgif-frame-027.png'),
];

/**
 * Loading screen component displayed on app startup.
 * Shows "MealScanner" heading and animated sprite of dancing veggies.
 * 
 * To disable this loading screen, set ENABLE_LOADING_SCREEN to false in app/_layout.tsx
 */
export function LoadingScreen() {
  const insets = useSafeAreaInsets();
  
  // Animated value for fading/flashing loading text
  const loadingOpacity = useSharedValue(0.3);

  useEffect(() => {
    // Create a pulsing/fading animation that repeats infinitely
    loadingOpacity.value = withRepeat(
      withTiming(1, { duration: 1000 }),
      -1, // Infinite repeats
      true // Reverse the animation (fade in and out)
    );
  }, [loadingOpacity]);

  const loadingTextStyle = useAnimatedStyle(() => {
    return {
      opacity: loadingOpacity.value,
    };
  });

  return (
    <ThemedView style={[styles.container, { backgroundColor: bgPrimary }]}>
      {/* Centered content container with heading, animation, and loading text */}
      <View style={styles.centeredContent}>
        {/* MealScanner Heading - Above animation */}
        <ThemedText type="title" style={styles.heading}>
          MealScanner
        </ThemedText>

        {/* Sprite Animation - Centered */}
        <View style={styles.animationWrapper}>
          <SpriteAnimation
            frames={spriteFrames}
            fps={12}
            loop={true}
            width={336}
            height={336}
          />
        </View>

        {/* Loading text - Below animation with fading/flashing effect */}
        <Animated.Text style={[styles.loadingText, loadingTextStyle]}>
          loading
        </Animated.Text>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'], // Increased padding to prevent text cutoff
  },
  heading: {
    ...TextStyles.h1,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontWeight: '800', // Explicitly set to UltraBold (800) - boldest heading option
    color: neonGreen, // Use neon green color from UI theme
    marginBottom: Spacing.sm, // Reduced spacing - closer to animation (8px instead of 24px)
    paddingHorizontal: Spacing.base, // Extra horizontal padding to prevent cutoff
    overflow: 'visible', // Ensure text isn't clipped
  },
  animationWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...TextStyles.bodySmall,
    textAlign: 'center',
    color: textMuted,
    marginTop: Spacing.xl, // Space between animation and loading text
    textTransform: 'lowercase',
  },
});

