import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { AnimatedLogo, StaticLogo } from '@/components/ui/AnimatedLogo';
import { SpriteAnimation } from '@/components/ui/SpriteAnimation';
import { Brand } from '@/constants/Brand';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';

// Import all 27 optimized sprite frames (WebP, 340x340, ~12KB each)
const spriteFrames = [
  require('../assets/images/loading-animation-optimized/ezgif-frame-001.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-002.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-003.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-004.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-005.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-006.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-007.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-008.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-009.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-010.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-011.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-012.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-013.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-014.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-015.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-016.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-017.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-018.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-019.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-020.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-021.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-022.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-023.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-024.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-025.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-026.webp'),
  require('../assets/images/loading-animation-optimized/ezgif-frame-027.webp'),
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PROGRESS_BAR_WIDTH = SCREEN_WIDTH * 0.5;

export interface LoadingOverlayProps {
  /** Whether the loading screen should be visible */
  isVisible?: boolean;
  /** Whether this is the user's first time launching the app */
  isFirstLaunch?: boolean;
  /** Callback when the fade-out animation completes */
  onFadeComplete?: () => void;
  /** Callback when the loading screen is ready to dismiss (internal animation complete) */
  onReadyToDismiss?: () => void;
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
 * 
 * **First-time users** get an extended animation sequence:
 * 1. Logo intro: Animated logo scales up with rotating blob
 * 2. Logo hold: Logo continues rotating/pulsing
 * 3. Logo exit: Logo "sucks into" the back of the screen
 * 4. Veggies: Dancing vegetables animation with MealScanner text
 * 
 * **Returning users** get a shorter experience:
 * 1. Logo intro: Animated logo scales up with rotating blob
 * 2. Logo hold: Brief moment
 * 3. Logo fade: Simple fade out
 */
export function LoadingScreen({ 
  isVisible = true, 
  isFirstLaunch,
  onFadeComplete,
  onReadyToDismiss,
}: LoadingOverlayProps) {
  const [internalReady, setInternalReady] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const hasSignaledReadyRef = useRef(false);
  const timeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const placeholderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPlaceholderLogo, setShowPlaceholderLogo] = useState(false);
  
  // Overall container fade out
  const opacity = useSharedValue(1);
  
  // Two mutually exclusive startup visuals:
  // - First launch: veggies (shown only once, right after install)
  // - Returning: rotating logo (shown on subsequent startups)
  const veggiesGroupOpacity = useSharedValue(0);
  const veggiesScale = useSharedValue(0.98);
  const logoGroupOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.98);
  const brandTextOpacity = useSharedValue(0);
  const brandTextTranslateY = useSharedValue(8);
  const brandTaglineOpacity = useSharedValue(0);
  const brandTaglineTranslateY = useSharedValue(8);

  const signalReadyOnce = useCallback(() => {
    if (hasSignaledReadyRef.current) return;
    hasSignaledReadyRef.current = true;
    setInternalReady(true);
    onReadyToDismiss?.();
  }, [onReadyToDismiss]);

  // Cleanup scheduled timeouts on unmount
  useEffect(() => {
    return () => {
      if (placeholderTimeoutRef.current) {
        clearTimeout(placeholderTimeoutRef.current);
        placeholderTimeoutRef.current = null;
      }
      timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutsRef.current = [];
    };
  }, []);

  // If first-launch status is still being resolved, wait a beat before showing the logo.
  // This avoids flashing the logo on true first launch (so users mostly see veggies first).
  useEffect(() => {
    if (isFirstLaunch !== undefined) {
      if (placeholderTimeoutRef.current) {
        clearTimeout(placeholderTimeoutRef.current);
        placeholderTimeoutRef.current = null;
      }
      return;
    }

    if (showPlaceholderLogo) return;
    if (placeholderTimeoutRef.current) return;

    placeholderTimeoutRef.current = setTimeout(() => {
      setShowPlaceholderLogo(true);
      placeholderTimeoutRef.current = null;
    }, 140);
  }, [isFirstLaunch, showPlaceholderLogo]);

  // Animate the placeholder logo if first-launch detection takes a moment.
  useEffect(() => {
    if (isFirstLaunch !== undefined) return;
    if (!showPlaceholderLogo) return;

    logoGroupOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
    logoScale.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) });
    brandTextOpacity.value = withDelay(90, withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) }));
    brandTextTranslateY.value = withDelay(90, withTiming(0, { duration: 240, easing: Easing.out(Easing.quad) }));
    brandTaglineOpacity.value = withDelay(160, withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) }));
    brandTaglineTranslateY.value = withDelay(160, withTiming(0, { duration: 240, easing: Easing.out(Easing.quad) }));
  }, [
    isFirstLaunch,
    showPlaceholderLogo,
    logoGroupOpacity,
    logoScale,
    brandTextOpacity,
    brandTextTranslateY,
    brandTaglineOpacity,
    brandTaglineTranslateY,
  ]);

  // Start the animation sequence only once first-launch status is known.
  useEffect(() => {
    if (hasStarted) return;
    if (isFirstLaunch === undefined) return;

    setHasStarted(true);

    // Reset to deterministic initial state
    veggiesGroupOpacity.value = 0;
    veggiesScale.value = 0.98;
    brandTextOpacity.value = 0;
    brandTextTranslateY.value = 8;
    brandTaglineOpacity.value = 0;
    brandTaglineTranslateY.value = 8;

    if (!showPlaceholderLogo) {
      logoGroupOpacity.value = 0;
      logoScale.value = 0.98;
    }

    if (isFirstLaunch) {
      // First launch: veggies only
      veggiesGroupOpacity.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) });
      veggiesScale.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.back(1.02)) });

      // If logo placeholder was visible, fade it out smoothly
      if (showPlaceholderLogo) {
        logoGroupOpacity.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) });
        brandTextOpacity.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) });
        brandTextTranslateY.value = withTiming(8, { duration: 180, easing: Easing.out(Easing.quad) });
        brandTaglineOpacity.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) });
        brandTaglineTranslateY.value = withTiming(8, { duration: 180, easing: Easing.out(Easing.quad) });
      }

      timeoutsRef.current.push(setTimeout(() => {
        signalReadyOnce();
      }, 1800));
    } else {
      // Returning: tasteful rotating logo only
      logoGroupOpacity.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) });
      logoScale.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) });
      brandTextOpacity.value = withDelay(120, withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }));
      brandTextTranslateY.value = withDelay(120, withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) }));
      brandTaglineOpacity.value = withDelay(200, withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }));
      brandTaglineTranslateY.value = withDelay(200, withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) }));

      timeoutsRef.current.push(setTimeout(() => {
        signalReadyOnce();
      }, 850));
    }
  }, [
    hasStarted,
    isFirstLaunch,
    showPlaceholderLogo,
    veggiesGroupOpacity,
    veggiesScale,
    logoGroupOpacity,
    logoScale,
    signalReadyOnce,
  ]);

  // Handle visibility fade out
  useEffect(() => {
    if (!isVisible && internalReady) {
      opacity.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished && onFadeComplete) {
          runOnJS(onFadeComplete)();
        }
      });
    }
  }, [isVisible, internalReady, onFadeComplete, opacity]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const veggiesGroupAnimatedStyle = useAnimatedStyle(() => ({
    opacity: veggiesGroupOpacity.value,
    transform: [{ scale: veggiesScale.value }],
  }));

  const logoGroupAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoGroupOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const brandTextAnimatedStyle = useAnimatedStyle(() => ({
    opacity: brandTextOpacity.value,
    transform: [{ translateY: brandTextTranslateY.value }],
  }));

  const brandTaglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: brandTaglineOpacity.value,
    transform: [{ translateY: brandTaglineTranslateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, { backgroundColor: Brand.ink }, animatedContainerStyle]}>
      <View style={styles.centeredContent}>

        {/* Default startup: tasteful rotating logo only */}
        <Animated.View style={[styles.logoPhaseContainer, logoGroupAnimatedStyle]} pointerEvents="none">
          <AnimatedLogo
            size={220}
            playIntro={false}
            playExit={false}
            exitMode="fade-out"
          />
          <Animated.View style={[styles.logoTitleWrapper, brandTextAnimatedStyle]}>
            <ThemedText type="title" style={styles.logoTitle}>
              MealScanner
            </ThemedText>
          </Animated.View>
          <Animated.View style={[styles.logoTaglineWrapper, brandTaglineAnimatedStyle]}>
            <ThemedText style={styles.logoTagline}>
              Snap • Analyze • EatSmarter
            </ThemedText>
          </Animated.View>
        </Animated.View>

        {/* First launch only: veggies intro (shown once after install) */}
        {isFirstLaunch && (
          <Animated.View style={[styles.veggiesContainer, veggiesGroupAnimatedStyle]} pointerEvents="none">
            {/* Header Group: Logo + Title + Tagline */}
            <View style={styles.headerGroup}>
              <View style={styles.titleRow}>
                <StaticLogo size={36} />
                <ThemedText type="title" style={styles.heading}>
                  MealScanner
                </ThemedText>
              </View>
              <ThemedText style={styles.tagline}>
                photo • analyze • eat smarter
              </ThemedText>
            </View>

            <View style={styles.animationWrapper}>
              <SpriteAnimation
                frames={spriteFrames}
                fps={12}
                loop={true}
                width={320}
                height={320}
              />
            </View>

            <View style={styles.footerGroup}>
              <IndeterminateProgressBar />
            </View>
          </Animated.View>
        )}
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
  logoPhaseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTitleWrapper: {
    marginTop: Spacing.xl,
  },
  logoTitle: {
    ...TextStyles.h1,
    fontSize: 32,
    lineHeight: 38,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontWeight: '800',
    color: Brand.bone,
    letterSpacing: -0.6,
  },
  logoTaglineWrapper: {
    marginTop: Spacing.xs,
  },
  logoTagline: {
    ...TextStyles.caption,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'lowercase',
    textAlign: 'center',
    color: Brand.matcha,
    opacity: 0.95,
  },
  veggiesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    width: '100%',
  },
  headerGroup: {
    alignItems: 'center',
    marginBottom: -Spacing['2xl'], // Pull veggies tighter to the tagline
    zIndex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  heading: {
    ...TextStyles.h1,
    fontSize: 32,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontWeight: '800',
    color: Brand.bone,  // Editorial Herbarium: warm cream for headings
    letterSpacing: -0.5,
  },
  tagline: {
    ...TextStyles.bodySmall,
    color: Brand.sage,  // Editorial Herbarium: soft sage for secondary text
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'lowercase',
    opacity: 0.8,
    marginTop: Spacing.xs,
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
    backgroundColor: Brand.matcha,  // Editorial Herbarium: matcha accent
    borderRadius: 2,
    shadowColor: Brand.matcha,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
