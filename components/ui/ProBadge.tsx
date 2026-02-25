import { neonGreen } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

interface ProBadgeProps {
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function ProBadge({ style, textStyle }: ProBadgeProps) {
  const badgeOpacity = useSharedValue(0);

  useEffect(() => {
    badgeOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
  }, []);

  const badgeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
  }));

  return (
    <Animated.View style={[styles.badge, badgeAnimatedStyle, style]}>
        <Text style={[styles.text, textStyle]}>PRO</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: neonGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  text: {
    ...TextStyles.caption,
    color: '#000',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});


