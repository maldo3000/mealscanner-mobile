/**
 * MaterialSegmentRing
 *
 * A premium Skia-rendered segmented ring for macro nutrients.
 * Features:
 * - Layered strokes (track, main segment, highlight, inner shadow)
 * - End-cap glow at segment head
 * - Mount animation with easeOut timing
 * - Optional glow flicker on mount complete
 */

import { BlurMask, Canvas, Circle, LinearGradient, Path, Skia, vec } from '@shopify/react-native-skia';
import React, { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

const IS_ANDROID = Platform.OS === 'android';
import {
    Easing,
    useDerivedValue,
    useSharedValue,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/context/ThemeContext';

export interface SegmentData {
  label: string;
  value: number;
  color: string;
}

interface MaterialSegmentRingProps {
  /** Size of the ring in pixels */
  size?: number;
  /** Stroke width of the segments */
  strokeWidth?: number;
  /** Array of segment data (label, value, color) */
  segments: SegmentData[];
  /** Animation duration in ms */
  animationDuration?: number;
  /** Delay before animation starts */
  animationDelay?: number;
}

// Adjust hex color brightness
const adjustHexColor = (hex: string, amount: number): string => {
  const hexMatch = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!hexMatch) return hex;

  const numeric = parseInt(hexMatch[1], 16);
  const r = Math.min(255, Math.max(0, ((numeric >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((numeric >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (numeric & 0xff) + amount));

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export function MaterialSegmentRing({
  size = 80,
  strokeWidth = 4,
  segments,
  animationDuration = 600,
  animationDelay = 0,
}: MaterialSegmentRingProps) {
  const { tokens, withAlpha } = useTheme();

  // Animation shared values
  const animatedProgress = useSharedValue(0);
  const glowFlicker = useSharedValue(0);

  // Calculate ring dimensions
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Skia canvas needs extra padding for glow effects
  const glowPadding = Math.max(12, Math.ceil(strokeWidth * 2));
  const canvasSize = size + glowPadding * 2;
  const canvasCenter = center + glowPadding;

  // Highlight arc dimensions
  const highlightInset = strokeWidth * 0.35;
  const highlightRadius = Math.max(1, radius - highlightInset);
  const hotSpotRadius = Math.max(1.5, strokeWidth * 0.35);

  // Track styling
  const trackColor = withAlpha(tokens.textPrimary, 0.08);
  const highlightOpacity = 0.22;

  // Calculate segment angles (quadrant-based with gaps)
  const segmentCount = segments.length;
  const gapDegrees = 8; // Gap between segments
  const totalGapDegrees = gapDegrees * segmentCount;
  const availableDegrees = 360 - totalGapDegrees;
  const segmentSweep = availableDegrees / segmentCount;

  // Animate on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      animatedProgress.value = withTiming(1, {
        duration: animationDuration,
        easing: Easing.out(Easing.cubic),
      });

      // Glow flicker at end of animation
      setTimeout(() => {
        glowFlicker.value = withSequence(
          withTiming(1, { duration: 80 }),
          withTiming(0, { duration: 150, easing: Easing.out(Easing.quad) })
        );
      }, animationDuration - 100);
    }, animationDelay);

    return () => clearTimeout(timer);
  }, [animationDelay, animationDuration]);

  // Create segment paths and derived values
  const segmentConfigs = useMemo(() => {
    return segments.map((segment, index) => {
      const startAngle = index * (segmentSweep + gapDegrees) + gapDegrees / 2 - 90; // Start from top
      const gradientTop = adjustHexColor(segment.color, 32);
      const gradientBottom = adjustHexColor(segment.color, -28);
      const hotSpotColor = adjustHexColor(segment.color, 48);
      const highlightColor = withAlpha(tokens.textPrimary, highlightOpacity);
      const shadowColor = withAlpha('#000000', 0.35);

      return {
        ...segment,
        startAngle,
        sweep: segmentSweep,
        gradientTop,
        gradientBottom,
        hotSpotColor,
        highlightColor,
        shadowColor,
      };
    });
  }, [segments, segmentSweep, gapDegrees, tokens.textPrimary, withAlpha]);

  // Derived animated paths for each segment
  const animatedSegments = segmentConfigs.map((config, index) => {
    const animatedSweep = useDerivedValue(() => {
      return config.sweep * animatedProgress.value;
    });

    const arcPath = useDerivedValue(() => {
      const path = Skia.Path.Make();
      if (animatedSweep.value <= 0) return path;

      const rect = {
        x: canvasCenter - radius,
        y: canvasCenter - radius,
        width: radius * 2,
        height: radius * 2,
      };
      path.addArc(rect, config.startAngle, animatedSweep.value);
      return path;
    });

    const highlightPath = useDerivedValue(() => {
      const path = Skia.Path.Make();
      if (animatedSweep.value <= 0) return path;

      const rect = {
        x: canvasCenter - highlightRadius,
        y: canvasCenter - highlightRadius,
        width: highlightRadius * 2,
        height: highlightRadius * 2,
      };
      path.addArc(rect, config.startAngle, animatedSweep.value);
      return path;
    });

    const hotSpotPoint = useDerivedValue(() => {
      const endAngle = config.startAngle + animatedSweep.value;
      const angle = (endAngle * Math.PI) / 180;
      return {
        x: canvasCenter + Math.cos(angle) * radius,
        y: canvasCenter + Math.sin(angle) * radius,
      };
    });

    const glowOpacity = useDerivedValue(() => {
      return animatedSweep.value > 0 ? 0.25 + glowFlicker.value * 0.5 : 0;
    });

    const hotSpotOpacity = useDerivedValue(() => {
      return animatedSweep.value > 0 ? 0.85 + glowFlicker.value * 0.15 : 0;
    });

    return {
      config,
      arcPath,
      highlightPath,
      hotSpotPoint,
      glowOpacity,
      hotSpotOpacity,
    };
  });

  // Static track path (full circle, slightly dimmer)
  const trackPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addCircle(canvasCenter, canvasCenter, radius);
    return path;
  }, [canvasCenter, radius]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Canvas
        style={[
          styles.canvas,
          {
            width: canvasSize,
            height: canvasSize,
            left: -glowPadding,
            top: -glowPadding,
          },
        ]}
      >
        {/* Background track circle */}
        <Path
          path={trackPath}
          color={trackColor}
          style="stroke"
          strokeWidth={strokeWidth}
        />

        {/* Render each segment with layered effects */}
        {animatedSegments.map(({ config, arcPath, highlightPath, hotSpotPoint, glowOpacity, hotSpotOpacity }, index) => (
          <React.Fragment key={config.label}>
            {/* Inner shadow (offset darker arc with blur) */}
            <Path
              path={arcPath}
              style="stroke"
              strokeWidth={strokeWidth}
              strokeCap="round"
              color={config.shadowColor}
              opacity={0.3}
            >
              {!IS_ANDROID && <BlurMask blur={3} style="normal" />}
            </Path>

            {/* Outer glow for segment */}
            <Path
              path={arcPath}
              style="stroke"
              strokeWidth={strokeWidth}
              strokeCap="round"
              color={config.color}
              opacity={glowOpacity}
            >
              {!IS_ANDROID && <BlurMask blur={10} style="outer" />}
            </Path>

            {/* Main segment arc with vertical gradient */}
            <Path
              path={arcPath}
              style="stroke"
              strokeWidth={strokeWidth}
              strokeCap="round"
            >
              <LinearGradient
                start={vec(canvasCenter, canvasCenter - radius)}
                end={vec(canvasCenter, canvasCenter + radius)}
                colors={[config.gradientTop, config.color, config.gradientBottom]}
              />
            </Path>

            {/* Specular highlight (thin arc inset) */}
            <Path
              path={highlightPath}
              style="stroke"
              strokeWidth={Math.max(1, strokeWidth * 0.22)}
              strokeCap="round"
              color={config.highlightColor}
            />

            {/* End-cap hot spot glow */}
            <Circle
              cx={hotSpotPoint.value.x}
              cy={hotSpotPoint.value.y}
              r={hotSpotRadius}
              color={config.hotSpotColor}
              opacity={hotSpotOpacity}
            >
              {!IS_ANDROID && <BlurMask blur={3} style="normal" />}
            </Circle>
          </React.Fragment>
        ))}
      </Canvas>
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
  canvas: {
    position: 'absolute',
  },
});

export default MaterialSegmentRing;
