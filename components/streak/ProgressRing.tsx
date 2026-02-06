/**
 * ProgressRing Component
 * Animated circular progress ring for streak display
 */

import { neonGreen } from '@/constants/Colors';
import type { StreakCardState } from '@/types/streak';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  /** Progress value 0-1 */
  progress: number;
  /** Ring size in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Current card state for styling */
  cardState: StreakCardState;
  /** Children to render in center */
  children?: React.ReactNode;
  /** Animation duration in ms */
  animationDuration?: number;
}

// Colors
const RING_BG_COLOR = 'rgba(255, 255, 255, 0.08)';
const RING_ACTIVE_COLOR = neonGreen;
const RING_AT_RISK_COLOR = '#fde047'; // Yellow accent

export function ProgressRing({
  progress,
  size = 180,
  strokeWidth = 8,
  cardState,
  children,
  animationDuration = 450,
}: ProgressRingProps) {
  // Animated values
  const animatedProgress = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.6);

  // Calculate ring dimensions
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Animate progress when it changes
  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: animationDuration,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, animationDuration]);

  // Pulse animation for NOT_LOCKED and AT_RISK states
  useEffect(() => {
    if (cardState === 'AT_RISK') {
      // Faster pulse for at-risk
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // Infinite
        true
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 600 }),
          withTiming(0.5, { duration: 600 })
        ),
        -1,
        true
      );
    } else if (cardState === 'NOT_LOCKED') {
      // Subtle pulse for not locked (only if streak > 0)
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1200 }),
          withTiming(0.4, { duration: 1200 })
        ),
        -1,
        true
      );
    } else {
      // LOCKED - no pulse, steady glow
      pulseScale.value = withTiming(1, { duration: 300 });
      glowOpacity.value = withTiming(0.6, { duration: 300 });
    }
  }, [cardState]);

  // Animated props for the progress circle
  const animatedCircleProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - animatedProgress.value);
    return {
      strokeDashoffset,
    };
  });

  // Animated style for glow container
  const glowContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Determine ring color based on state
  const ringColor = cardState === 'AT_RISK' ? RING_AT_RISK_COLOR : RING_ACTIVE_COLOR;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Glow effect behind ring */}
      <Animated.View
        style={[
          styles.glowContainer,
          { width: size, height: size },
          glowContainerStyle,
        ]}
      >
        <View
          style={[
            styles.glow,
            {
              width: size - strokeWidth * 2,
              height: size - strokeWidth * 2,
              borderRadius: (size - strokeWidth * 2) / 2,
              shadowColor: ringColor,
              shadowRadius: 20,
              shadowOpacity: 0.4,
            },
          ]}
        />
      </Animated.View>

      {/* SVG Ring */}
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={ringColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={ringColor} stopOpacity="0.7" />
          </LinearGradient>
        </Defs>

        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={RING_BG_COLOR}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress circle */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedCircleProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>

      {/* Center content */}
      <View style={[styles.centerContent, { width: size, height: size }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProgressRing;
