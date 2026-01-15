import React from 'react';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';
import { Image } from 'expo-image';

import { TextStyles } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';

// Import the full logo
const logoImage = require('@/assets/images/mealscanner-logo.png');

type BrandLogoSize = 'sm' | 'md' | 'lg';

interface BrandLogoProps {
  /** Size variant */
  size?: BrandLogoSize;
  /** Text color */
  textColor?: string;
  /** Whether to show the text */
  showText?: boolean;
  /** Additional container styles */
  style?: ViewStyle;
  /** Additional text styles */
  textStyle?: TextStyle;
}

const sizeConfig = {
  sm: {
    logoSize: 24,
    fontSize: 16,
    fontWeight: '700' as const,
    gap: Spacing.xs,
  },
  md: {
    logoSize: 32,
    fontSize: 20,
    fontWeight: '700' as const,
    gap: Spacing.sm,
  },
  lg: {
    logoSize: 40,
    fontSize: 24,
    fontWeight: '800' as const,
    gap: Spacing.sm,
  },
};

/**
 * MealScanner brand logo with optional text.
 * Use this component for consistent branding across the app.
 * 
 * @example
 * ```tsx
 * // Logo + text (default)
 * <BrandLogo size="md" textColor={colors.text} />
 * 
 * // Logo only
 * <BrandLogo size="sm" showText={false} />
 * ```
 */
export function BrandLogo({
  size = 'md',
  textColor = '#FFFFFF',
  showText = true,
  style,
  textStyle,
}: BrandLogoProps) {
  const config = sizeConfig[size];

  return (
    <View style={[styles.container, { gap: config.gap }, style]}>
      <Image
        source={logoImage}
        style={{ width: config.logoSize, height: config.logoSize }}
        contentFit="contain"
        priority="high"
        transition={0}
        cachePolicy="memory-disk"
      />
      {showText && (
        <Text
          style={[
            styles.text,
            {
              fontSize: config.fontSize,
              fontWeight: config.fontWeight,
              color: textColor,
            },
            textStyle,
          ]}
        >
          MealScanner
        </Text>
      )}
    </View>
  );
}

/**
 * Just the logo icon without text.
 * Useful for compact spaces like tab bars or small headers.
 */
export function BrandLogoIcon({ size = 32 }: { size?: number }) {
  return (
    <Image
      source={logoImage}
      style={{ width: size, height: size }}
      contentFit="contain"
      priority="high"
      transition={0}
      cachePolicy="memory-disk"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    ...TextStyles.h3,
    letterSpacing: -0.3,
  },
});
