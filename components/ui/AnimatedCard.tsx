import React from 'react';
import { StyleSheet, ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Card } from './Card';

interface AnimatedCardProps extends ViewProps {
  children: React.ReactNode;
  delay?: number;
  variant?: 'default' | 'glass' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function AnimatedCard({
  children,
  delay = 0,
  variant = 'glass',
  padding = 'md',
  style,
  ...props
}: AnimatedCardProps) {
  const translateY = useSharedValue(30);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    setTimeout(() => {
      translateY.value = withSpring(0, { damping: 15, stiffness: 100 });
      opacity.value = withTiming(1, { duration: 500 });
    }, delay);
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Card variant={variant} padding={padding} style={style} {...props}>
        {children}
      </Card>
    </Animated.View>
  );
}







