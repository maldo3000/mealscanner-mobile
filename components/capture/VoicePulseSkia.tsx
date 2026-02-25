/**
 * VoicePulseSkia
 *
 * A premium Skia-rendered voice recording pulse visualization.
 * Features:
 * - Radial gradients that fade from center to transparent
 * - Multiple concentric rings with blur effects
 * - Smooth audio-reactive animations
 * - Clean, diffuse appearance
 */

import {
    BlurMask,
    Canvas,
    Circle,
    Group,
    RadialGradient,
    vec,
} from '@shopify/react-native-skia';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
    Extrapolate,
    interpolate,
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const IS_ANDROID = Platform.OS === 'android';

import { useTheme } from '@/context/ThemeContext';

interface VoicePulseSkiaProps {
  metering: number;
  isRecording: boolean;
  size?: number;
}

export function VoicePulseSkia({
  metering,
  isRecording,
  size = 88,
}: VoicePulseSkiaProps): React.ReactElement {
  const { tokens, withAlpha } = useTheme();

  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const blurValues = IS_ANDROID
    ? {
        outer: 12,
        middle: 10,
        inner: 8,
        core: 6,
      }
    : {
        outer: 20,
        middle: 15,
        inner: 10,
        core: 8,
      };

  // Canvas needs extra padding for the expanded pulse
  const maxScale = 2.6;
  const canvasSize = size * maxScale;
  const center = canvasSize / 2;
  const baseRadius = size / 2;

  useEffect(() => {
    if (isRecording) {
      opacity.value = withTiming(1, { duration: 300 });

      // Metering ranges from -160 to 0 (dB)
      // We care mostly about -60 to -10 for visualization
      const targetScale = interpolate(
        metering,
        [-60, -10],
        [1, 2.4],
        Extrapolate.CLAMP
      );

      scale.value = withSpring(targetScale, {
        damping: 15,
        stiffness: 120,
        mass: 0.8,
      });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withSpring(1);
    }
  }, [metering, isRecording, opacity, scale]);

  // Derived values for the rings
  const outerRingRadius = useDerivedValue(() => baseRadius * scale.value);
  const middleRingRadius = useDerivedValue(() => baseRadius * scale.value * 0.85);
  const innerRingRadius = useDerivedValue(() => baseRadius * scale.value * 0.7);

  // Animate the container opacity for smooth fade
  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Colors for the gradients
  const accentColor = tokens.accent;
  const accentTransparent = withAlpha(tokens.accent, 0);
  const accentLight = withAlpha(tokens.accent, IS_ANDROID ? 0.55 : 0.4);
  const accentMedium = withAlpha(tokens.accent, IS_ANDROID ? 0.34 : 0.2);

  return (
    <View style={[styles.container, { width: canvasSize, height: canvasSize }]} pointerEvents="none">
      <Animated.View style={[styles.canvasContainer, containerStyle]}>
        <Canvas style={styles.canvas}>
          {/* Outer diffuse ring - largest, most transparent */}
          <Group>
            <Circle cx={center} cy={center} r={outerRingRadius}>
              <RadialGradient
                c={vec(center, center)}
                r={baseRadius * maxScale}
                colors={[accentMedium, accentTransparent]}
              />
              <BlurMask blur={blurValues.outer} style="normal" />
            </Circle>
          </Group>

          {/* Middle ring - medium size, medium opacity */}
          <Group>
            <Circle cx={center} cy={center} r={middleRingRadius}>
              <RadialGradient
                c={vec(center, center)}
                r={baseRadius * maxScale * 0.85}
                colors={[accentLight, accentTransparent]}
              />
              <BlurMask blur={blurValues.middle} style="normal" />
            </Circle>
          </Group>

          {/* Inner ring - smallest, most visible */}
          <Group>
            <Circle cx={center} cy={center} r={innerRingRadius}>
              <RadialGradient
                c={vec(center, center)}
                r={baseRadius * maxScale * 0.7}
                colors={[accentColor, accentLight, accentTransparent]}
                positions={[0, 0.4, 1]}
              />
              <BlurMask blur={blurValues.inner} style="normal" />
            </Circle>
          </Group>

          {/* Core glow - bright center spot */}
          <Circle cx={center} cy={center} r={baseRadius * 0.6}>
            <RadialGradient
              c={vec(center, center)}
              r={baseRadius * 0.8}
              colors={[accentColor, accentLight, accentTransparent]}
              positions={[0, 0.5, 1]}
            />
            <BlurMask blur={blurValues.core} style="normal" />
          </Circle>
        </Canvas>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  canvasContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  canvas: {
    flex: 1,
  },
});

export default VoicePulseSkia;
