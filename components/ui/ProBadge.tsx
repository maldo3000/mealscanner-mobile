import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { neonGreen } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';

interface ProBadgeProps {
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function ProBadge({ style, textStyle }: ProBadgeProps) {
  return (
    <View style={[styles.badge, style]}>
      <Text style={[styles.text, textStyle]}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: neonGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    ...TextStyles.caption,
    color: '#000',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});


