/**
 * StreakCard Component
 * Main streak display card with progress ring, stats, and CTAs
 */

import { useIsFocused } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const LightningIcon = require('@/assets/images/Reward_Streak-Lightning.png');

import { BlurMask, Canvas, Circle, RadialGradient, vec } from '@shopify/react-native-skia';

const IS_ANDROID = Platform.OS === 'android';

import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Spacing } from '@/constants/Spacing';
import { useTheme } from '@/context/ThemeContext';
import { getDeadlineTimeString } from '@/services/streakService';
import { MIN_LOGS_PER_DAY, type StreakCardState, type StreakSummary } from '@/types/streak';
import { ProgressRing } from './ProgressRing';
import { StreakChipsRow } from './StreakChipsRow';

interface StreakCardProps {
  /** Streak summary data */
  streakSummary: StreakSummary;
  /** Callback when "Log now" is pressed */
  onLogNow: () => void;
  /** Callback when card/View streak is pressed */
  onViewStreak: () => void;
  /** Previous card state for transition detection */
  previousCardState?: StreakCardState;
}

// Sparkle particle component for celebrations
function SparkleParticle({ delay, x, y }: { delay: number; x: number; y: number }) {
  const { tokens } = useTheme();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      opacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 350 })
      );
      scale.value = withSequence(
        withSpring(1.2, { damping: 10 }),
        withTiming(0.5, { duration: 300 })
      );
      translateY.value = withTiming(-20, { duration: 500 });
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.sparkle,
        { left: x, top: y },
        animatedStyle,
      ]}
    >
      <IconSymbol name="sparkle" size={12} color={tokens.accent} />
    </Animated.View>
  );
}

export function StreakCard({
  streakSummary,
  onLogNow,
  onViewStreak,
  previousCardState,
}: StreakCardProps) {
  const { tokens } = useTheme();
  const isFocused = useIsFocused();
  
  const { cardState, currentStreak, mealsLoggedToday } = streakSummary;
  
  // Animation values - start at 0 for entrance animation
  const badgeScale = useSharedValue(0);
  const badgeGlowOpacity = useSharedValue(0);
  const glowPulse = useSharedValue(0);
  const [showSparkles, setShowSparkles] = useState(false);
  const celebrationTriggered = useRef(false);
  const hasAnimatedOnLoad = useRef(false);

  // Derived values for Skia glow to make it more organic
  const skiaRadius = useDerivedValue(() => 42 + glowPulse.value * 6);
  const skiaBlur = useDerivedValue(() => 12 + glowPulse.value * 8);

  // Calculate progress for ring
  const progress = Math.min(mealsLoggedToday / MIN_LOGS_PER_DAY, 1);

  // Entrance animation for lightning bolt
  const triggerEntranceAnimation = useCallback(() => {
    if (hasAnimatedOnLoad.current) {
      // Already animated, just ensure visible state
      badgeScale.value = 1;
      badgeGlowOpacity.value = 1;
      return;
    }
    hasAnimatedOnLoad.current = true;
    
    // Elegant bounce scale up with overshoot (bulge effect)
    badgeScale.value = withSequence(
      withSpring(1.15, { damping: 8, stiffness: 120 }), // Overshoot
      withSpring(1, { damping: 12, stiffness: 100 }) // Settle
    );
    
    // Fade in the glow smoothly
    badgeGlowOpacity.value = withTiming(1, { 
      duration: 600, 
      easing: Easing.out(Easing.ease) 
    });
    
    // After entrance, start continuous subtle pulse
    setTimeout(() => {
      // Primary scale pulse - very subtle
      badgeScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // Infinite
        true
      );
      
      // Opacity pulse for the container
      badgeGlowOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.8, { duration: 2500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Skia-specific internal pulse for radius/blur
      glowPulse.value = withRepeat(
        withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }, 1000);
  }, [badgeScale, badgeGlowOpacity, glowPulse]);

  // Reset animation flag when navigating away so it re-plays when returning
  useEffect(() => {
    if (!isFocused) {
      hasAnimatedOnLoad.current = false;
      badgeScale.value = 0;
      badgeGlowOpacity.value = 0;
      glowPulse.value = 0;
    } else if (isFocused && streakSummary) {
      // When screen regains focus, trigger animation
      const timeout = setTimeout(triggerEntranceAnimation, 300);
      return () => clearTimeout(timeout);
    }
  }, [isFocused, streakSummary, triggerEntranceAnimation]);

  // Detect transition from NOT_LOCKED to LOCKED
  useEffect(() => {
    if (
      previousCardState &&
      previousCardState !== 'LOCKED' &&
      cardState === 'LOCKED' &&
      !celebrationTriggered.current
    ) {
      celebrationTriggered.current = true;
      triggerLockCelebration();
    }
  }, [cardState, previousCardState]);

  const triggerLockCelebration = useCallback(() => {
    // Haptic feedback
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      // Haptics not available
    }

    // Badge scale animation
    badgeScale.value = withSequence(
      withSpring(1.15, { damping: 8, stiffness: 400 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );

    // Show sparkles
    setShowSparkles(true);
    setTimeout(() => {
      setShowSparkles(false);
      celebrationTriggered.current = false;
    }, 800);
  }, []);

  // Badge animated style
  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  // Badge glow animated style
  const badgeGlowStyle = useAnimatedStyle(() => ({
    opacity: badgeGlowOpacity.value,
    transform: [{ scale: badgeScale.value }],
  }));

  // Get headline text based on state
  const getHeadline = () => {
    if (cardState === 'LOCKED') return 'Streak saved';
    return 'Streak';
  };

  // Get subtext based on state
  const getSubtext = () => {
    if (cardState === 'LOCKED') {
      return 'Locked for today';
    }
    if (cardState === 'AT_RISK') {
      const deadline = getDeadlineTimeString();
      return `Log by ${deadline} to keep it.`;
    }
    return `Log ${MIN_LOGS_PER_DAY} meal today to keep it.`;
  };

  // Get CTA button text
  const getCtaText = () => {
    if (cardState === 'LOCKED') return 'View streak';
    return 'Log now';
  };

  // Handle CTA press
  const handleCtaPress = () => {
    if (cardState === 'LOCKED') {
      onViewStreak();
    } else {
      onLogNow();
    }
  };

  return (
    <View>
      <Pressable onPress={onViewStreak}>
        <Card variant="glass" style={styles.card}>
        {/* Main content area */}
        <View style={styles.mainContent}>
          {/* Ring container with overlaid lightning bolt */}
          <View style={styles.ringContainer}>
            {/* Progress Ring with Text */}
            <ProgressRing
              progress={progress}
              size={180}
              strokeWidth={8}
              cardState={cardState}
              isActive={isFocused}
            >
              {/* Center content - just number and label */}
              <View style={styles.centerContent}>
                {/* Streak number */}
                <Text style={[styles.streakNumber, { color: tokens.textPrimary }]}>
                  {currentStreak}
                </Text>
                <Text style={[styles.streakLabel, { color: tokens.textPrimary }]}>
                  DAYS
                </Text>
              </View>
            </ProgressRing>

            {/* Lightning bolt positioned at top of ring, overlapping the edge */}
            <View style={styles.lightningWrapper}>
              {/* Smooth diffuse glow using Skia */}
              <Animated.View style={[styles.skiaGlowContainer, badgeGlowStyle]}>
                <Canvas style={styles.glowCanvas}>
                  <Circle cx={48} cy={48} r={skiaRadius}>
                    <RadialGradient
                      c={vec(48, 48)}
                      r={skiaRadius}
                      colors={['rgba(255, 200, 74, 0.45)', 'rgba(255, 200, 74, 0)']}
                    />
                    {!IS_ANDROID && <BlurMask blur={skiaBlur} style="normal" />}
                  </Circle>
                </Canvas>
              </Animated.View>
              
              {/* Lightning icon */}
              <Animated.View style={[styles.badgeContainer, badgeAnimatedStyle]}>
                <Image source={LightningIcon} style={{ width: 86, height: 86 }} />
              </Animated.View>
            </View>
          </View>

          {/* Sparkle particles for celebration */}
          {showSparkles && (
            <View style={styles.sparklesContainer}>
              <SparkleParticle delay={0} x={60} y={20} />
              <SparkleParticle delay={50} x={100} y={10} />
              <SparkleParticle delay={100} x={140} y={25} />
              <SparkleParticle delay={75} x={80} y={140} />
              <SparkleParticle delay={125} x={120} y={150} />
            </View>
          )}

          {/* Subtext */}
          <Text style={[styles.subtext, { color: tokens.textMuted }]}>
            {getSubtext()}
          </Text>

          {/* CTA Button */}
          <TouchableOpacity
            style={[
              styles.ctaButton,
              { 
                backgroundColor: tokens.accent,
                shadowColor: tokens.accent,
              },
              cardState === 'LOCKED' && {
                shadowOpacity: 0.4,
              },
            ]}
            onPress={handleCtaPress}
            activeOpacity={0.8}
          >
            <Text style={[styles.ctaButtonText, { color: tokens.textOnAccent }]}>
              {getCtaText()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: tokens.border }]} />

        {/* Bottom chips row */}
        <StreakChipsRow streakSummary={streakSummary} />
      </Card>
    </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  mainContent: {
    alignItems: 'center',
    paddingBottom: Spacing.lg,
  },
  ringContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    // Add padding at top to accommodate the overlapping lightning bolt
    paddingTop: 36,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightningWrapper: {
    position: 'absolute',
    top: 8,
    left: 7,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  skiaGlowContainer: {
    position: 'absolute',
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    // No overflow: 'hidden' so glow can extend naturally
  },
  glowCanvas: {
    width: 96,
    height: 96,
  },
  badgeContainer: {
    // Lightning bolt sits on top of glow
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 52,
    letterSpacing: -1,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: -4,
    opacity: 0.9,
  },
  subtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  ctaButton: {
    paddingHorizontal: Spacing.xl * 2,
    paddingVertical: Spacing.md,
    borderRadius: 9999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginHorizontal: -Spacing.md,
    marginBottom: Spacing.lg,
    opacity: 0.3,
  },
  sparklesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  sparkle: {
    position: 'absolute',
  },
});

export default StreakCard;
