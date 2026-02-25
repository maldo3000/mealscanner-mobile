/**
 * ProgressRing Component
 * Animated circular progress ring for streak display
 */

import { useTheme } from '@/context/ThemeContext';
import type { StreakCardState } from '@/types/streak';
import { BlurMask, Canvas, Circle, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

const IS_ANDROID = Platform.OS === 'android';
import Animated, {
    cancelAnimation,
    Easing,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';

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
  /** Whether the component is visible/active — pauses infinite animations when false */
  isActive?: boolean;
}

// Colors
const RING_BG_COLOR = 'rgba(255, 255, 255, 0.08)';
const RING_AT_RISK_COLOR = '#fde047'; // Yellow accent

const adjustHexColor = (hex: string, amount: number): string => {
  const hexMatch = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!hexMatch) return hex;

  const numeric = parseInt(hexMatch[1], 16);
  const r = Math.min(255, Math.max(0, ((numeric >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((numeric >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (numeric & 0xff) + amount));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export function ProgressRing({
  progress,
  size = 180,
  strokeWidth = 8,
  cardState,
  children,
  animationDuration = 450,
  isActive = true,
}: ProgressRingProps) {
  const { tokens, withAlpha } = useTheme();
  
  // Animated values
  const animatedProgress = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.6);

  // Calculate ring dimensions
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  
  // Skia canvas needs extra padding for glow (blur=12 needs sufficient space)
  const glowPadding = Math.max(20, Math.ceil(strokeWidth * 2.5));
  const canvasSize = size + glowPadding * 2;
  const canvasCenter = center + glowPadding;
  
  // Highlight arc dimensions
  const highlightInset = strokeWidth * 0.35;
  const highlightRadius = Math.max(1, radius - highlightInset);
  const hotSpotRadius = Math.max(1.5, strokeWidth * 0.22);

  // Determine ring color based on state
  const ringColor = cardState === 'AT_RISK' ? RING_AT_RISK_COLOR : tokens.accent;
  const gradientTop = adjustHexColor(ringColor, 28);
  const gradientBottom = adjustHexColor(ringColor, -26);
  const hotSpotColor = adjustHexColor(ringColor, 42);
  const highlightColor = withAlpha(tokens.textPrimary, 0.18);

  // Animate progress when it changes
  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: animationDuration,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, animationDuration]);

  // Pulse animation for NOT_LOCKED and AT_RISK states — gated by isActive
  useEffect(() => {
    if (!isActive) {
      // Stop infinite animations when off-screen to save GPU cycles
      cancelAnimation(pulseScale);
      cancelAnimation(glowOpacity);
      pulseScale.value = 1;
      glowOpacity.value = 0.6;
      return;
    }

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

    return () => {
      cancelAnimation(pulseScale);
      cancelAnimation(glowOpacity);
    };
  }, [cardState, isActive]);

  // Derived arc angle from animated progress
  const arcAngle = useDerivedValue(() => {
    return animatedProgress.value * 360;
  });

  // Create arc path - needs to be derived for animation
  const arcPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (arcAngle.value <= 0) return path;
    const rect = {
      x: canvasCenter - radius,
      y: canvasCenter - radius,
      width: radius * 2,
      height: radius * 2,
    };
    path.addArc(rect, -90, arcAngle.value);
    return path;
  });

  const highlightPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (arcAngle.value <= 0) return path;
    const rect = {
      x: canvasCenter - highlightRadius,
      y: canvasCenter - highlightRadius,
      width: highlightRadius * 2,
      height: highlightRadius * 2,
    };
    path.addArc(rect, -90, arcAngle.value);
    return path;
  });

  const hotSpotX = useDerivedValue(() => {
    const angle = ((arcAngle.value - 90) * Math.PI) / 180;
    return canvasCenter + Math.cos(angle) * radius;
  });

  const hotSpotY = useDerivedValue(() => {
    const angle = ((arcAngle.value - 90) * Math.PI) / 180;
    return canvasCenter + Math.sin(angle) * radius;
  });

  // Animated style for pulse container
  const pulseContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Static track path
  const trackPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addCircle(canvasCenter, canvasCenter, radius);
    return path;
  }, [canvasCenter, radius]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={[styles.ringFrame, { width: size, height: size }, pulseContainerStyle]}>
        <Canvas
          style={[
            styles.ringCanvas,
            {
              width: canvasSize,
              height: canvasSize,
              left: -glowPadding,
              top: -glowPadding,
            },
          ]}
        >
          {/* Track circle */}
          <Path
            path={trackPath}
            color={RING_BG_COLOR}
            style="stroke"
            strokeWidth={strokeWidth}
          />

          {/* Outer glow for progress arc */}
          <Path
            path={arcPath}
            style="stroke"
            strokeWidth={strokeWidth}
            strokeCap="round"
            color={ringColor}
            opacity={0.3}
          >
            {!IS_ANDROID && <BlurMask blur={12} style="outer" />}
          </Path>

          {/* Main progress arc with vertical gradient */}
          <Path path={arcPath} style="stroke" strokeWidth={strokeWidth} strokeCap="round">
            <LinearGradient
              start={vec(canvasCenter, canvasCenter - radius)}
              end={vec(canvasCenter, canvasCenter + radius)}
              colors={[gradientTop, ringColor, gradientBottom]}
            />
          </Path>

          {/* Inner specular highlight */}
          <Path
            path={highlightPath}
            style="stroke"
            strokeWidth={Math.max(1, strokeWidth * 0.25)}
            strokeCap="round"
            color={highlightColor}
          />

          {/* Hot spot at leading edge */}
          <Circle
            cx={hotSpotX}
            cy={hotSpotY}
            r={hotSpotRadius}
            color={hotSpotColor}
            opacity={0.85}
          >
            {!IS_ANDROID && <BlurMask blur={4} style="normal" />}
          </Circle>
        </Canvas>
      </Animated.View>

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
    overflow: 'visible',
  },
  ringFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  ringCanvas: {
    position: 'absolute',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProgressRing;
