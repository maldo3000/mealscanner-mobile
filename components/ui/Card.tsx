import { CardPadding } from '@/constants/Layout';
import { PageSpacing } from '@/constants/Spacing';
import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { GlassCard } from './GlassCard';

export type CardVariant = 'default' | 'glass' | 'elevated';
export type CardPaddingVariant = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends ViewProps {
  variant?: CardVariant;
  accentColor?: string;
  children: React.ReactNode;
  noBorder?: boolean;
  padding?: CardPaddingVariant;
  gap?: number;
}

export function Card({
  variant = 'glass',
  accentColor,
  children,
  style,
  noBorder,
  padding = 'md',
  gap,
  ...props
}: CardProps) {
  const { tokens } = useTheme();
  const paddingValue = CardPadding[padding];

  // Use GlassCard for glassmorphic effect
  if (variant === 'glass' || variant === 'default') {
    return (
      <GlassCard
        style={style}
        noBorder={noBorder}
        padding={paddingValue}
        gap={gap}
        {...props}
      >
        {children}
      </GlassCard>
    );
  }

  // Fallback for elevated variant (slightly more opaque)
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: accentColor || tokens.glassSurface,
          borderColor: tokens.glassBorder,
          padding: paddingValue,
          gap: gap || PageSpacing.elementGap,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
  },
});
