import { IconSymbol } from '@/components/ui/IconSymbol';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface AnimatedTabIconProps {
  focused: boolean;
  color: string;
  name: string;
  size?: number;
}

/**
 * Simplified AnimatedTabIcon that works with the CustomTabBar's liquid indicator
 * Handles icon scaling and color transitions
 */
export function AnimatedTabIcon({ focused, color, name, size = 24 }: AnimatedTabIconProps) {
  const iconScale = useSharedValue(focused ? 1.1 : 1);

  useEffect(() => {
    // Spring config for a snappy, physical feel
    const springConfig = { damping: 15, stiffness: 300 };
    
    if (focused) {
      iconScale.value = withSpring(1.15, springConfig);
    } else {
      iconScale.value = withSpring(1, springConfig);
    }
  }, [focused]);

  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: iconScale.value }],
    };
  });

  return (
    <View style={styles.wrapper}>
      <Animated.View style={iconStyle}>
        <IconSymbol 
          size={size} 
          name={name as any} 
          // Icon turns black when the neon green bubble slides behind it,
          // otherwise remains semi-transparent white
          color={focused ? '#000000' : 'rgba(255, 255, 255, 0.5)'} 
        />
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
});
