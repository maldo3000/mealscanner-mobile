import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { Colors } from '@/constants/Colors';
import { BorderRadius, Shadows } from '@/constants/Layout';
import { ComponentSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from './IconSymbol';

interface NutritionCardProps extends ViewProps {
  value: number | string;
  label: string;
  icon?: string;
  color?: string;
  unit?: string;
  progress?: number; // 0-1 for circular progress
  progressText?: string; // Text to display instead of circular progress
  size?: 'small' | 'medium' | 'large';
  delay?: number;
}

const nutritionIcons: Record<string, string> = {
  calories: 'flame.fill',
  protein: 'figure.strengthtraining.traditional',
  fat: 'drop.fill',
  carbs: 'leaf.fill',
  fiber: 'leaf.arrow.circlepath',
};

const nutritionColors: Record<string, string> = {
  calories: '#4ade80', // neonGreen
  protein: '#10B981', // green-500
  fat: '#F59E0B', // amber-500
  carbs: '#3B82F6', // blue-500
  fiber: '#8B5CF6', // purple-500
};

export function NutritionCard({
  value,
  label,
  icon,
  color,
  unit = '',
  progress,
  progressText,
  size = 'medium',
  delay = 0,
  style,
  ...props
}: NutritionCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 12, stiffness: 100 });
      opacity.value = withTiming(1, { duration: 400 });
    }, delay);
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const cardColor = color || nutritionColors[label.toLowerCase()] || colors.tint;
  const cardIcon = icon || nutritionIcons[label.toLowerCase()] || 'circle.fill';

  const getSizeStyles = () => {
    switch (size) {
      case 'large':
        return { padding: Spacing.lg, minHeight: 120 };
      case 'small':
        return { padding: Spacing.base, minHeight: 80 };
      default:
        return { padding: ComponentSpacing.cardPadding, minHeight: 100 };
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'large':
        return { value: TextStyles.h1, label: TextStyles.body };
      case 'small':
        return { value: TextStyles.bodyMedium, label: TextStyles.caption };
      default:
        return { value: TextStyles.h3, label: TextStyles.bodySmall };
    }
  };

  const textStyles = getTextSize();

  return (
    <Animated.View
      style={[
        styles.card,
        getSizeStyles(),
        {
          backgroundColor: `${cardColor}15`, // 15% opacity
          borderColor: `${cardColor}30`, // 30% opacity
        },
        animatedStyle,
        style,
      ]}
      {...props}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconBackground, { backgroundColor: `${cardColor}25` }]}>
            <IconSymbol name={cardIcon} size={size === 'large' ? 28 : size === 'small' ? 20 : 24} color={cardColor} />
          </View>
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[textStyles.value, { color: cardColor, fontWeight: '700' }]}>
            {value}
            {unit && <Text style={[textStyles.label, { color: colors.icon, fontSize: (textStyles.value.fontSize || 24) * 0.5, fontWeight: '400' }]}> {unit}</Text>}
          </Text>
          <Text style={[textStyles.label, { color: colors.icon, marginTop: Spacing.xs }]}>
            {label}
          </Text>
          {progressText && (
            <Text style={[TextStyles.caption, { color: cardColor, marginTop: Spacing.xs, fontWeight: '600' }]}>
              {progressText}
            </Text>
          )}
        </View>

        {progress !== undefined && !progressText && (
          <View style={styles.progressContainer}>
            <CircularProgress value={progress} color={cardColor} size={size === 'large' ? 48 : size === 'small' ? 32 : 40} />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

function CircularProgress({ value, color, size = 40 }: { value: number; color: string; size?: number }) {
  const animatedValue = useSharedValue(0);

  React.useEffect(() => {
    animatedValue.value = withTiming(value, { duration: 800 });
  }, [value]);

  const animatedStyle = useAnimatedStyle(() => {
    const percentage = Math.round(animatedValue.value * 100);
    return {
      opacity: 1,
    };
  });

  return (
    <Animated.View style={[styles.progressWrapper, { width: size, height: size }, animatedStyle]}>
      <View style={[styles.progressCircle, { width: size, height: size, borderRadius: size / 2, borderColor: color }]}>
        <Text style={[TextStyles.caption, { color, fontSize: size * 0.25, fontWeight: '600' }]}>
          {Math.round(value * 100)}%
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    ...Shadows.md,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: Spacing.sm,
  },
  iconBackground: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  progressContainer: {
    marginTop: Spacing.sm,
  },
  progressWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
});

