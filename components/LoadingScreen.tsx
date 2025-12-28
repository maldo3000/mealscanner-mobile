import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { SpriteAnimation } from '@/components/ui/SpriteAnimation';
import { bgPrimary, neonGreen, textMuted } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';

// Import all 27 sprite frames
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PROGRESS_BAR_WIDTH = SCREEN_WIDTH * 0.5;

interface LoadingScreenProps {
  isVisible?: boolean;
  onFadeComplete?: () => void;
}

/**
 * A sleek, indeterminate loading bar with a neon glow
 */
function IndeterminateProgressBar() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { 
        duration: 1800, 
        easing: Easing.bezier(0.4, 0, 0.2, 1) 
      }),
      -1,
      false
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [-PROGRESS_BAR_WIDTH * 0.6, PROGRESS_BAR_WIDTH]
    );

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, animatedStyle]} />
      </View>
    </View>
  );
}

/**
 * Loading screen component displayed on app startup.
 * Shows "MealScanner" heading, tagline, animated sprite of dancing veggies, and a loading bar.
 */
export function LoadingScreen({ isVisible = true, onFadeComplete }: LoadingScreenProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!isVisible) {
      opacity.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished && onFadeComplete) {
          runOnJS(onFadeComplete)();
        }
      });
    }
  }, [isVisible, onFadeComplete, opacity]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgPrimary }, animatedContainerStyle]}>
      <View style={styles.centeredContent}>
        {/* Header Group: Title + Tagline */}
        <View style={styles.headerGroup}>
          <ThemedText type="title" style={styles.heading}>
            MealScanner
          </ThemedText>
          <ThemedText style={styles.tagline}>
            snap • analyze • eat smarter
          </ThemedText>
        </View>

        {/* Sprite Animation Group */}
        <View style={styles.animationWrapper}>
          <SpriteAnimation
            frames={spriteFrames}
            fps={12}
            loop={true}
            width={320}
            height={320}
          />
        </View>

        {/* Footer Group: Loading Bar */}
        <View style={styles.footerGroup}>
          <IndeterminateProgressBar />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  headerGroup: {
    alignItems: 'center',
    marginBottom: -Spacing['2xl'], // Pull veggies tighter to the tagline
    zIndex: 1,
  },
  heading: {
    ...TextStyles.h1,
    fontSize: 32,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontWeight: '800',
    color: neonGreen,
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  tagline: {
    ...TextStyles.bodySmall,
    color: textMuted,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'lowercase',
    opacity: 0.8,
  },
  animationWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -Spacing.base, // Pull veggies closer to header
  },
  footerGroup: {
    marginTop: -Spacing.xl, // Pull loading bar closer to animation
    alignItems: 'center',
    width: '100%',
  },
  progressContainer: {
    width: PROGRESS_BAR_WIDTH,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  progressTrack: {
    flex: 1,
    width: '100%',
  },
  progressFill: {
    width: '40%',
    height: '100%',
    backgroundColor: neonGreen,
    borderRadius: 2,
    shadowColor: neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
