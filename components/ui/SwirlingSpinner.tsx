/**
 * SwirlingSpinner
 *
 * A smooth, GPU-accelerated loading spinner using Skia.
 * Features:
 * - Rotating arc with gradient tail (swirling effect)
 * - Configurable size for buttons vs full-screen use
 * - Theme-aware accent color
 * - Runs entirely on the GPU thread for 60fps+ performance
 */

import {
    BlurMask,
    Canvas,
    Path,
    Skia,
    SweepGradient,
    vec,
} from '@shopify/react-native-skia';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

const IS_ANDROID = Platform.OS === 'android';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';

import { useTheme } from '@/context/ThemeContext';

export interface SwirlingSpinnerProps {
  /** Size of the spinner. 'small' for buttons, 'large' for full-screen */
  size?: 'small' | 'large' | number;
  /** Optional custom color (defaults to theme accent) */
  color?: string;
}

const SIZE_MAP = {
  small: 20,
  large: 48,
} as const;

export function SwirlingSpinner({
  size = 'large',
  color,
}: SwirlingSpinnerProps): React.ReactElement {
  const { tokens, withAlpha } = useTheme();

  const spinnerSize = typeof size === 'number' ? size : SIZE_MAP[size];
  const strokeWidth = spinnerSize * 0.12;
  const radius = (spinnerSize - strokeWidth) / 2;
  const center = spinnerSize / 2;

  // Rotation animation (continuous)
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1, // infinite
      false // don't reverse
    );
  }, [rotation]);

  // Create the arc path (270 degrees = 3/4 of a circle for the tail effect)
  const arcPath = React.useMemo(() => {
    const path = Skia.Path.Make();
    const arcLength = 270; // degrees
    const startAngle = -90; // start from top

    // Create arc using oval bounds
    const oval = {
      x: center - radius,
      y: center - radius,
      width: radius * 2,
      height: radius * 2,
    };

    path.addArc(oval, startAngle, arcLength);
    return path;
  }, [center, radius]);

  // Animated rotation for the canvas container
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Colors
  const accentColor = color ?? tokens.accent;
  const accentTransparent = withAlpha(accentColor, 0);
  const accentMedium = withAlpha(accentColor, 0.5);

  return (
    <View style={[styles.container, { width: spinnerSize, height: spinnerSize }]}>
      <Animated.View style={[styles.canvasWrapper, animatedStyle]}>
        <Canvas style={{ width: spinnerSize, height: spinnerSize }}>
          <Path
            path={arcPath}
            style="stroke"
            strokeWidth={strokeWidth}
            strokeCap="round"
          >
            <SweepGradient
              c={vec(center, center)}
              colors={[accentTransparent, accentMedium, accentColor]}
              start={0}
              end={270}
            />
            {!IS_ANDROID && <BlurMask blur={strokeWidth * 0.3} style="solid" />}
          </Path>
        </Canvas>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvasWrapper: {
    flex: 1,
  },
});

export default SwirlingSpinner;
