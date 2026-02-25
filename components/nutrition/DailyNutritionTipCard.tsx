import React from 'react';
import { Image, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import type { NutritionTip } from '@/constants/NutritionTips';
import { Spacing } from '@/constants/Spacing';
import { FontFamilies, TextStyles } from '@/constants/Typography';
import { useTheme } from '@/context/ThemeContext';

const TipIcon = require('@/assets/images/mealscanner-tip.png');

interface DailyNutritionTipCardProps {
  tip: NutritionTip;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function DailyNutritionTipCard({ tip, onPress, style }: DailyNutritionTipCardProps) {
  const { tokens, accentAlpha } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Daily nutrition tip: ${tip.title}`}
      accessibilityHint="Opens a sheet with more details."
      style={style}
    >
      <Card
        variant="glass"
        padding="lg"
        style={[
          styles.card,
          {
            borderColor: accentAlpha(0.22),
            backgroundColor: tokens.glassSurface,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Image source={TipIcon} style={styles.tipIcon} />
            <Text style={[TextStyles.caption, { color: tokens.accent, fontFamily: FontFamilies.headingBold, fontWeight: '800', letterSpacing: 0.5 }]}>
              DAILY TIP
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={18} color={tokens.textMuted} />
        </View>

        <Text style={[TextStyles.h4, { color: tokens.textPrimary, marginTop: Spacing.sm }]}>
          {tip.title}
        </Text>
        <Text
          style={[TextStyles.bodySmall, { color: tokens.textMuted, marginTop: 6 }]}
          numberOfLines={2}
        >
          {tip.summary}
        </Text>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tipIcon: {
    width: 28,
    height: 28,
  },
});

