import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { neonGreen } from '@/constants/Colors';

type Props = {
  size: number;
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  isPrimary?: boolean;
  accessibilityLabel?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassCircleButton({
  size,
  children,
  onPress,
  style,
  isPrimary,
  accessibilityLabel,
}: Props) {
  const r = size / 2;
  const pressProgress = useSharedValue(0);

  const handlePressIn = () => {
    pressProgress.value = withSpring(1, { damping: 16, stiffness: 420 });
  };

  const handlePressOut = () => {
    pressProgress.value = withSpring(0, { damping: 16, stiffness: 420 });
  };

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress?.();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressProgress.value, [0, 1], [1, 0.95]) }],
  }));

  const shadowStyle = {
    shadowColor: isPrimary ? neonGreen : neonGreen,
    shadowOpacity: isPrimary ? 0.45 : 0.2,
    shadowRadius: isPrimary ? 30 : 15,
    shadowOffset: { width: 0, height: isPrimary ? 10 : 6 },
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[{ width: size, height: size }, style, animatedStyle]}
    >
      {/* OUTER shadow wrapper */}
      <View style={[styles.shadowWrap, shadowStyle, { width: size, height: size, borderRadius: r }]}>
        
        {/* INNER glass container */}
        <View style={[styles.glass, { width: size, height: size, borderRadius: r }]}>
          
          {/* Milky Translucent Blur */}
          <BlurView
            intensity={isPrimary ? 40 : 50}
            tint="dark"
            style={[StyleSheet.absoluteFill, { borderRadius: r }]}
          />

          {/* Milky/Bright Green Wash */}
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { 
                borderRadius: r, 
                backgroundColor: isPrimary ? 'rgba(50, 255, 120, 0.85)' : 'rgba(127, 226, 122, 0.15)' 
              },
            ]}
          />

          {/* SVG Layer for Specular Sheen (Liquid Glass Effect) */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width="100%" height="100%">
              <Defs>
                {/* The "Liquid" Sheen - sharp at top-left, fades to nothing */}
                <LinearGradient id="liquidSheen" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0" stopColor="white" stopOpacity="0.8" />
                  <Stop offset="0.15" stopColor="white" stopOpacity="0.4" />
                  <Stop offset="0.5" stopColor="white" stopOpacity="0.05" />
                  <Stop offset="1" stopColor="white" stopOpacity="0" />
                </LinearGradient>

                {/* Surface highlight */}
                <LinearGradient id="faceSheen" x1="0%" y1="0%" x2="50%" y2="100%">
                  <Stop offset="0" stopColor="white" stopOpacity="0.3" />
                  <Stop offset="0.6" stopColor="white" stopOpacity="0" />
                </LinearGradient>
              </Defs>

              {/* Surface Sheen */}
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#faceSheen)" />

              {/* Sharp Edge Rim (The specular catch) */}
              <Circle
                cx={r}
                cy={r}
                r={r - 0.5}
                fill="none"
                stroke="url(#liquidSheen)"
                strokeWidth="1.2"
              />
            </Svg>
          </View>

          {/* Subtle edge for thickness definition */}
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: r,
                borderWidth: isPrimary ? 0 : 1,
                borderBottomWidth: 1.5,
                borderColor: isPrimary ? 'rgba(0, 0, 0, 0.08)' : 'rgba(127, 226, 122, 0.25)',
              },
            ]}
          />

          {/* Icon/Text Content */}
          <View style={styles.content}>{children}</View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    ...Platform.select({
      ios: {},
      android: { elevation: 12 },
    }),
  },
  glass: {
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
