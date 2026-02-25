import { neonGreen } from '@/constants/Colors';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    Extrapolate,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

interface VoicePulseProps {
  metering: number;
  isRecording: boolean;
  size?: number;
  color?: string;
}

export function VoicePulse({
  metering,
  isRecording,
  size = 88,
  color = neonGreen,
}: VoicePulseProps): React.ReactElement {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isRecording) {
      opacity.value = withSpring(0.6);
      
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
      opacity.value = withSpring(0);
      scale.value = withSpring(1);
    }
  }, [metering, isRecording, opacity, scale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const secondaryPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * 1.3 }],
    opacity: opacity.value * 0.4,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
      <Animated.View
        style={[
          styles.pulse,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            shadowColor: color,
          },
          pulseStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.pulse,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          secondaryPulseStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  pulse: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
});
