/**
 * StreakChipsRow Component
 * Three secondary stat chips: Next Milestone, Balanced Week, Consistency Score
 */

import { BorderRadius } from '@/constants/Layout';
import { Spacing } from '@/constants/Spacing';
import { useTheme } from '@/context/ThemeContext';
import type { StreakSummary } from '@/types/streak';
import { useIsFocused } from '@react-navigation/native';
import { BlurMask, Canvas, Circle, RadialGradient, vec } from '@shopify/react-native-skia';
import React, { useEffect } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
    cancelAnimation,
    Easing,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const IS_ANDROID = Platform.OS === 'android';

const BalancedLotusIcon = require('@/assets/images/Reward_Balanced-Lotus.png');
const ConsistencyCheckmarkIcon = require('@/assets/images/Reward_Concistency-Checkmark.png');
const LightningIcon = require('@/assets/images/Reward_Streak-Lightning.png');

// Glow colors for each chip type
const GLOW_COLORS = {
  yellow: ['rgba(255, 200, 74, 0.45)', 'rgba(255, 200, 74, 0)'],
  white: ['rgba(255, 255, 255, 0.35)', 'rgba(255, 255, 255, 0)'],
  green: ['rgba(74, 222, 128, 0.45)', 'rgba(74, 222, 128, 0)'],
} as const;

interface GlowIconProps {
  icon: React.ReactNode;
  glowColor: keyof typeof GLOW_COLORS;
  size?: number;
  isActive?: boolean;
}

// Reusable component that renders a Skia glow behind an icon with pulsing effect
function GlowIcon({ icon, glowColor, size = 56, isActive = true }: GlowIconProps) {
  const colors = GLOW_COLORS[glowColor];
  const center = size / 2;
  const radius = size / 2 - 2;

  // Pulse animation for the glow — gated by isActive
  const pulseValue = useSharedValue(0);

  useEffect(() => {
    if (!isActive) {
      cancelAnimation(pulseValue);
      pulseValue.value = 0;
      return;
    }

    pulseValue.value = withRepeat(
      withTiming(1, { 
        duration: 1500 + Math.random() * 1000, // Randomize to avoid uniform pulsing
        easing: Easing.inOut(Easing.ease) 
      }),
      -1,
      true
    );

    return () => {
      cancelAnimation(pulseValue);
    };
  }, [isActive]);

  // Derived values for Skia props to ensure they update efficiently
  const animatedRadius = useDerivedValue(() => {
    return radius * (0.9 + pulseValue.value * 0.15);
  });

  const animatedBlur = useDerivedValue(() => {
    return 8 + pulseValue.value * 6;
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Canvas style={{ position: 'absolute', width: size, height: size }}>
        <Circle cx={center} cy={center} r={animatedRadius}>
          <RadialGradient c={vec(center, center)} r={animatedRadius} colors={colors} />
          {!IS_ANDROID && <BlurMask blur={animatedBlur} style="normal" />}
        </Circle>
      </Canvas>
      {icon}
    </View>
  );
}

interface StreakChipsRowProps {
  streakSummary: StreakSummary;
}

interface ChipProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  index: number;
}

function Chip({ icon, title, subtitle, index }: ChipProps) {
  const { tokens } = useTheme();
  const isFocused = useIsFocused();

  // Entrance animation values - start from hidden/small
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(0); // Start from 0 for dramatic scale-up

  useEffect(() => {
    if (!isFocused) {
      // Reset when navigating away
      opacity.value = 0;
      translateY.value = 20;
      scale.value = 0;
    } else {
      // Increased delay to allow the card and lightning bolt to animate first
      const delay = 600 + (index * 150); 
      
      opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
      
      // Elegant bounce animation with overshoot (bulge)
      translateY.value = withDelay(
        delay, 
        withSpring(0, { 
          damping: 12,
          stiffness: 90, 
          mass: 0.8 
        })
      );
      
      // Scale with overshoot for entrance
      scale.value = withDelay(
        delay, 
        withSequence(
          withSpring(1.1, { damping: 10, stiffness: 120 }), // Overshoot
          withSpring(1, { damping: 14, stiffness: 100 }) // Settle
        )
      );
    }
  }, [isFocused, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
  }));

  return (
    <Animated.View 
      style={[styles.chip, animatedStyle]}
    >
      <View style={styles.chipIconContainer}>
        {icon}
      </View>
      <Text style={[styles.chipTitle, { color: tokens.textPrimary }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.chipSubtitle, { color: tokens.textMuted }]} numberOfLines={1}>
        {subtitle}
      </Text>
    </Animated.View>
  );
}

export function StreakChipsRow({ streakSummary }: StreakChipsRowProps) {
  const { nextMilestone, weeklyStats } = streakSummary;
  const isFocused = useIsFocused();

  return (
    <View style={styles.container}>
      {/* Chip 1: Next Milestone - Yellow glow */}
      <Chip
        index={0}
        icon={<GlowIcon icon={<Image source={LightningIcon} style={{ width: 40, height: 44 }} />} glowColor="yellow" isActive={isFocused} />}
        title="Next Milestone"
        subtitle={`${nextMilestone?.day || 3}-Day Badge`}
      />

      {/* Chip 2: Balanced Week - White glow */}
      <Chip
        index={1}
        icon={<GlowIcon icon={<Image source={BalancedLotusIcon} style={{ width: 40, height: 40 }} />} glowColor="white" isActive={isFocused} />}
        title="Balanced Week"
        subtitle={`Balanced days: ${weeklyStats.balancedDaysThisWeek}/7`}
      />

      {/* Chip 3: Consistency Score - Green glow */}
      <Chip
        index={2}
        icon={<GlowIcon icon={<Image source={ConsistencyCheckmarkIcon} style={{ width: 40, height: 40 }} />} glowColor="green" isActive={isFocused} />}
        title="Consistency Score"
        subtitle={`Logging days: ${weeklyStats.loggedDaysThisWeek}/7`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    minHeight: 100,
  },
  chipIconContainer: {
    marginBottom: Spacing.xs,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipTitle: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  chipSubtitle: {
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default StreakChipsRow;
