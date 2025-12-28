import React, { useEffect } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  FadeIn, 
  Easing, 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming 
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';

import { bgPrimary } from '@/constants/Colors';
import { PageSpacing } from '@/constants/Spacing';

interface PageContainerProps extends ViewProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  backgroundColor?: string;
  noPadding?: boolean;
  /**
   * If true, will skip the initial entry animation.
   * Useful for screens that want to handle their own data-ready animation.
   */
  skipAnimation?: boolean;
}

/**
 * Standardized page container wrapper
 * Handles safe area insets and provides consistent background and padding
 * Includes a premium entry animation to smooth out screen transitions
 */
export function PageContainer({
  children,
  edges = ['top'],
  backgroundColor = bgPrimary,
  noPadding = false,
  skipAnimation = false,
  style,
  ...props
}: PageContainerProps) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const opacity = useSharedValue(skipAnimation ? 1 : 0);

  useEffect(() => {
    if (!skipAnimation) {
      if (isFocused) {
        opacity.value = withTiming(1, { 
          duration: 300, 
          easing: Easing.out(Easing.quad) 
        });
      } else {
        // Prepare for next fade-in when screen is navigated away from
        opacity.value = 0;
      }
    } else {
      opacity.value = 1;
    }
  }, [isFocused, skipAnimation]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    flex: 1,
  }));

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor },
        style,
      ]}
      edges={edges}
      {...props}
    >
      <Animated.View style={animatedStyle}>
        {noPadding ? (
          children
        ) : (
          <View
            style={[
              styles.content,
              { paddingHorizontal: PageSpacing.containerPadding },
            ]}
          >
            {children}
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

