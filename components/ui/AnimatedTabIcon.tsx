import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming,
  interpolateColor
} from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { neonGreen } from '@/constants/Colors';

interface AnimatedTabIconProps {
  focused: boolean;
  color: string;
  name: string;
  size?: number;
}

export function AnimatedTabIcon({ focused, color, name, size = 24 }: AnimatedTabIconProps) {
  const scale = useSharedValue(focused ? 1.2 : 1);
  const progress = useSharedValue(focused ? 1 : 0);
  const iconScale = useSharedValue(focused ? 1 : 0.85);

  useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.2, { damping: 10, stiffness: 400 });
      progress.value = withTiming(1, { duration: 250 });
      iconScale.value = withSpring(1, { damping: 10, stiffness: 400 });
    } else {
      scale.value = withSpring(1, { damping: 10, stiffness: 400 });
      progress.value = withTiming(0, { duration: 250 });
      iconScale.value = withSpring(0.85, { damping: 10, stiffness: 400 });
    }
  }, [focused, scale, progress, iconScale]);

  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      backgroundColor: interpolateColor(
        progress.value,
        [0, 1],
        ['transparent', neonGreen]
      ),
      shadowOpacity: progress.value * 0.5,
      shadowRadius: progress.value * 12,
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: iconScale.value }],
    };
  });

  // Use consistent container size regardless of icon size to prevent layout shifts
  const containerSize = 48;

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.container, { width: containerSize, height: containerSize, borderRadius: containerSize / 2 }, containerStyle]}>
        <Animated.View style={[styles.iconWrapper, iconStyle]}>
          <IconSymbol 
            size={size} 
            name={name as any} 
            color={focused ? '#000000' : 'rgba(255, 255, 255, 0.6)'} 
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: neonGreen,
    shadowOffset: { width: 0, height: 0 },
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

