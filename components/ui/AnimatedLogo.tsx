import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

// Import logo assets
const blobImage = require('@/assets/images/Mealscanner-logo_blob-isolation.png');
const forkKnifeImage = require('@/assets/images/mealscanner-logo_knife-isolation.png');

type ExitMode = 'suck-back' | 'fade-out';

interface AnimatedLogoProps {
  /** Size of the logo container */
  size?: number;
  /** Whether to play the intro animation (scale up from small) */
  playIntro?: boolean;
  /** Whether to play the exit animation */
  playExit?: boolean;
  /** Exit animation mode: 'suck-back' (dramatic) or 'fade-out' (subtle) */
  exitMode?: ExitMode;
  /** Callback when intro animation completes */
  onIntroComplete?: () => void;
  /** Callback when exit animation completes */
  onExitComplete?: () => void;
  /** Additional container styles */
  style?: ViewStyle;
}

/**
 * Animated MealScanner logo with:
 * - Rotating blob background
 * - Stationary fork & knife overlay
 * - Subtle pulse effect on both elements
 * - Optional intro/exit animations
 */
export function AnimatedLogo({
  size = 200,
  playIntro = true,
  playExit = false,
  exitMode = 'suck-back',
  onIntroComplete,
  onExitComplete,
  style,
}: AnimatedLogoProps) {
  // Animation values
  const blobRotation = useSharedValue(0);
  const pulse = useSharedValue(1);
  const introScale = useSharedValue(playIntro ? 0.3 : 1);
  const introOpacity = useSharedValue(playIntro ? 0 : 1);
  const exitScale = useSharedValue(1);
  const exitOpacity = useSharedValue(1);

  // Start continuous animations
  useEffect(() => {
    // Continuous blob rotation (slow, smooth)
    blobRotation.value = withRepeat(
      withTiming(360, {
        duration: 8000,
        easing: Easing.linear,
      }),
      -1, // Infinite
      false // Don't reverse
    );

    // Continuous pulse effect (subtle breathing)
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.97, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // Infinite
      true // Reverse (oscillate)
    );
  }, [blobRotation, pulse]);

  // Intro animation
  useEffect(() => {
    if (playIntro) {
      // Scale up from small with a nice bounce
      introScale.value = withTiming(
        1,
        {
          duration: 800,
          easing: Easing.out(Easing.back(1.2)),
        },
        (finished) => {
          if (finished && onIntroComplete) {
            runOnJS(onIntroComplete)();
          }
        }
      );
      
      // Fade in
      introOpacity.value = withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [playIntro, introScale, introOpacity, onIntroComplete]);

  // Exit animation (suck into back OR simple fade)
  useEffect(() => {
    if (playExit) {
      if (exitMode === 'suck-back') {
        // Dramatic exit: scale down rapidly like being sucked into the screen
        exitScale.value = withTiming(
          0.1,
          {
            duration: 500,
            easing: Easing.in(Easing.back(1.5)),
          },
          (finished) => {
            if (finished && onExitComplete) {
              runOnJS(onExitComplete)();
            }
          }
        );
        
        // Fade out slightly delayed
        exitOpacity.value = withDelay(
          200,
          withTiming(0, {
            duration: 300,
            easing: Easing.in(Easing.quad),
          })
        );
      } else {
        // Subtle exit: simple fade out (for returning users)
        exitOpacity.value = withTiming(
          0,
          {
            duration: 400,
            easing: Easing.out(Easing.quad),
          },
          (finished) => {
            if (finished && onExitComplete) {
              runOnJS(onExitComplete)();
            }
          }
        );
      }
    }
  }, [playExit, exitMode, exitScale, exitOpacity, onExitComplete]);

  // Animated styles for the container
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: introScale.value * exitScale.value },
    ],
    opacity: introOpacity.value * exitOpacity.value,
  }));

  // Animated style for rotating blob
  const blobAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${blobRotation.value}deg` },
      { scale: pulse.value },
    ],
  }));

  // Animated style for fork/knife (no rotation, just pulse)
  const forkKnifeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pulse.value },
    ],
  }));

  // Calculate inner sizes (fork/knife slightly smaller than blob)
  const blobSize = size;
  const forkKnifeSize = size * 0.65; // Fork/knife takes up ~65% of blob

  return (
    <Animated.View 
      style={[
        styles.container, 
        { width: size, height: size },
        containerAnimatedStyle,
        style,
      ]}
    >
      {/* Rotating blob background */}
      <Animated.View style={[styles.imageWrapper, blobAnimatedStyle]}>
        <Image
          source={blobImage}
          style={{ width: blobSize, height: blobSize }}
          contentFit="contain"
          priority="high"
          transition={0}
          cachePolicy="memory-disk"
        />
      </Animated.View>

      {/* Stationary fork & knife overlay */}
      <Animated.View style={[styles.overlay, forkKnifeAnimatedStyle]}>
        <Image
          source={forkKnifeImage}
          style={{ width: forkKnifeSize, height: forkKnifeSize }}
          contentFit="contain"
          priority="high"
          transition={0}
          cachePolicy="memory-disk"
        />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Static version of the logo (no animations) for use in headers/branding
 */
export function StaticLogo({ size = 40 }: { size?: number }) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={require('@/assets/images/mealscanner-logo.png')}
        style={{ width: size, height: size }}
        contentFit="contain"
        priority="high"
        transition={0}
        cachePolicy="memory-disk"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
