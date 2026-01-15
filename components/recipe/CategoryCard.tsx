import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { herbarium, neonGreen } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { FontFamilies } from '@/constants/Typography';

interface CategoryCardProps {
  icon: string;
  label: string;
  onPress: () => void;
  isSelected?: boolean;
  size?: 'small' | 'medium';
}

export function CategoryCard({
  icon,
  label,
  onPress,
  isSelected = false,
  size = 'medium',
}: CategoryCardProps) {
  const cardStyle = size === 'small' ? styles.cardSmall : styles.card;
  const iconSize = size === 'small' ? 28 : 36;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        cardStyle,
        isSelected && styles.cardSelected,
      ]}
    >
      {/* Wave decoration at bottom */}
      <View style={styles.waveDecoration} />
      
      {/* Icon */}
      <Text style={[styles.icon, { fontSize: iconSize }]}>{icon}</Text>
      
      {/* Label */}
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: herbarium.surface1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: herbarium.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  cardSmall: {
    backgroundColor: herbarium.surface1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: herbarium.border,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
    minWidth: 90,
    marginRight: Spacing.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: neonGreen,
    borderWidth: 2,
  },
  waveDecoration: {
    position: 'absolute',
    bottom: -15,
    left: -20,
    right: -20,
    height: 40,
    backgroundColor: herbarium.surface2,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    transform: [{ scaleX: 1.2 }],
  },
  icon: {
    marginBottom: Spacing.xs,
    zIndex: 1,
  },
  label: {
    fontFamily: FontFamilies.bodySemiBold,
    fontSize: 13,
    color: herbarium.textPrimary,
    textAlign: 'center',
    zIndex: 1,
    lineHeight: 16,
  },
});
