/**
 * StreakCard Component
 * Main streak display card with progress ring, stats, and CTAs
 */

import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';

import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, neonGreen } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
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
      <IconSymbol name="sparkle" size={12} color={neonGreen} />
    </Animated.View>
  );
}

export function StreakCard({
  streakSummary,
  onLogNow,
  onViewStreak,
  previousCardState,
}: StreakCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  
  const { cardState, currentStreak, mealsLoggedToday, isLockedToday } = streakSummary;
  
  // Animation values
  const badgeScale = useSharedValue(1);
  const showSparkles = useSharedValue(false);
  const celebrationTriggered = useRef(false);

  // Calculate progress for ring
  const progress = Math.min(mealsLoggedToday / MIN_LOGS_PER_DAY, 1);

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
    showSparkles.value = true;
    setTimeout(() => {
      showSparkles.value = false;
      celebrationTriggered.current = false;
    }, 800);
  }, []);

  // Badge animated style
  const badgeAnimatedStyle = useAnimatedStyle(() => ({
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
    <Pressable onPress={onViewStreak}>
      <Card variant="glass" style={styles.card}>
        {/* Main content area */}
        <View style={styles.mainContent}>
          {/* Progress Ring with Badge and Text */}
          <ProgressRing
            progress={progress}
            size={180}
            strokeWidth={8}
            cardState={cardState}
          >
            {/* Badge icon at top of center */}
            <View style={styles.centerContent}>
              <Animated.View style={[styles.badgeContainer, badgeAnimatedStyle]}>
                <View style={styles.badgeBackground}>
                  <IconSymbol name="bolt.fill" size={28} color="#fbbf24" />
                </View>
              </Animated.View>

              {/* Streak number */}
              <Text style={[styles.streakNumber, { color: colors.text }]}>
                {currentStreak}
              </Text>
              <Text style={[styles.streakLabel, { color: colors.text }]}>
                DAYS
              </Text>
            </View>
          </ProgressRing>

          {/* Sparkle particles for celebration */}
          {showSparkles.value && (
            <View style={styles.sparklesContainer}>
              <SparkleParticle delay={0} x={60} y={20} />
              <SparkleParticle delay={50} x={100} y={10} />
              <SparkleParticle delay={100} x={140} y={25} />
              <SparkleParticle delay={75} x={80} y={140} />
              <SparkleParticle delay={125} x={120} y={150} />
            </View>
          )}

          {/* Subtext */}
          <Text style={[styles.subtext, { color: colors.icon }]}>
            {getSubtext()}
          </Text>

          {/* CTA Button */}
          <TouchableOpacity
            style={[
              styles.ctaButton,
              cardState === 'LOCKED' && styles.ctaButtonLocked,
            ]}
            onPress={handleCtaPress}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>{getCtaText()}</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Bottom chips row */}
        <StreakChipsRow streakSummary={streakSummary} />
      </Card>
    </Pressable>
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
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  badgeContainer: {
    marginBottom: 4,
  },
  badgeBackground: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    // Add subtle glow
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    backgroundColor: neonGreen,
    paddingHorizontal: Spacing.xl * 2,
    paddingVertical: Spacing.md,
    borderRadius: 9999,
    shadowColor: neonGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaButtonLocked: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    shadowOpacity: 0.2,
  },
  ctaButtonText: {
    color: '#022c22',
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
