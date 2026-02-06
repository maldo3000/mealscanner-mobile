import React, { useEffect, useState } from 'react';
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
import { AnimatedLogo, StaticLogo } from '@/components/ui/AnimatedLogo';
import { Brand } from '@/constants/Brand';
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

// Animation phases for first-time users
type AnimationPhase = 'logo-intro' | 'logo-hold' | 'logo-exit' | 'veggies';

interface LoadingScreenProps {
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
  isFirstLaunch = false,
  onFadeComplete,
  onReadyToDismiss,
}: LoadingScreenProps) {
  const [phase, setPhase] = useState<AnimationPhase>('logo-intro');
  const [triggerExit, setTriggerExit] = useState(false);
  const [internalReady, setInternalReady] = useState(false);
  
  // Overall container fade out
  const opacity = useSharedValue(1);
  
  // Phase transition animations (for first-time users)
  const veggiesOpacity = useSharedValue(0);
  const veggiesScale = useSharedValue(0.8);
  const headerOpacity = useSharedValue(0);

  // Handle phase transitions
  const handleIntroComplete = () => {
    setPhase('logo-hold');
    
    // Determine hold time based on user type
    const holdDuration = isFirstLaunch ? 1200 : 800;
    
    setTimeout(() => {
      setTriggerExit(true);
      setPhase('logo-exit');
    }, holdDuration);
  };

  const handleExitComplete = () => {
    if (isFirstLaunch) {
      // First-time users: transition to veggies phase
      setPhase('veggies');
      
      // Animate in the veggies and header
      headerOpacity.value = withTiming(1, { 
        duration: 400, 
        easing: Easing.out(Easing.quad) 
      });
      
      veggiesOpacity.value = withTiming(1, { 
        duration: 500, 
        easing: Easing.out(Easing.quad) 
      });
      
      veggiesScale.value = withTiming(1, { 
        duration: 500, 
        easing: Easing.out(Easing.back(1.1)) 
      });
      
      // Let veggies dance for a bit, then signal ready
      setTimeout(() => {
        setInternalReady(true);
        onReadyToDismiss?.();
      }, 2000); // Let veggies dance for 2 seconds
    } else {
      // Returning users: signal ready immediately
      setInternalReady(true);
      onReadyToDismiss?.();
    }
  };

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

  const veggiesAnimatedStyle = useAnimatedStyle(() => ({
    opacity: veggiesOpacity.value,
    transform: [{ scale: veggiesScale.value }],
  }));

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const showLogo = phase === 'logo-intro' || phase === 'logo-hold' || phase === 'logo-exit';
  const showVeggies = phase === 'veggies' && isFirstLaunch;

  return (
    <Animated.View style={[styles.container, { backgroundColor: Brand.ink }, animatedContainerStyle]}>
      <View style={styles.centeredContent}>
        
        {/* Logo Animation Phase */}
        {showLogo && (
          <View style={styles.logoPhaseContainer}>
            <AnimatedLogo
              size={220}
              playIntro={true}
              playExit={triggerExit}
              exitMode={isFirstLaunch ? 'suck-back' : 'fade-out'}
              onIntroComplete={handleIntroComplete}
              onExitComplete={handleExitComplete}
            />
          </View>
        )}

        {/* Veggies Phase (First-time users only) */}
        {showVeggies && (
          <>
            {/* Header Group: Logo + Title + Tagline */}
            <Animated.View style={[styles.headerGroup, headerAnimatedStyle]}>
              <View style={styles.titleRow}>
                <StaticLogo size={36} />
                <ThemedText type="title" style={styles.heading}>
                  MealScanner
                </ThemedText>
              </View>
              <ThemedText style={styles.tagline}>
                photo • analyze • eat smarter
              </ThemedText>
            </Animated.View>

            {/* Sprite Animation Group */}
            <Animated.View style={[styles.animationWrapper, veggiesAnimatedStyle]}>
              <SpriteAnimation
                frames={spriteFrames}
                fps={12}
                loop={true}
                width={320}
                height={320}
              />
            </Animated.View>

            {/* Footer Group: Loading Bar */}
            <View style={styles.footerGroup}>
              <IndeterminateProgressBar />
            </View>
          </>
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
