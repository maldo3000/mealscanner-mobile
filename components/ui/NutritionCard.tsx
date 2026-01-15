import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path, G } from 'react-native-svg';

import { Colors, neonGreen, accentSky, accentYellow, accentCoral } from '@/constants/Colors';
import { BorderRadius, Shadows } from '@/constants/Layout';
import { ComponentSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from './IconSymbol';

interface MicroArcData {
  label: string;
  value: number;
  color: string;
}

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
  microArcs?: MicroArcData[];
}

const nutritionIcons: Record<string, string> = {
  calories: 'flame.fill',
  protein: 'figure.strengthtraining.traditional',
  fat: 'drop.fill',
  carbs: 'leaf.fill',
  fiber: 'leaf.arrow.circlepath',
  sugar: 'cube.fill',
  sodium: 'bolt.fill',
  cholesterol: 'heart.fill',
};

const nutritionColors: Record<string, string> = {
  calories: neonGreen, 
  protein: accentSky,     // #38bdf8 - matches main menu blue
  fat: accentCoral,       // #fb7185 - matches main menu light red
  carbs: accentYellow,    // #fde047 - matches main menu yellow
  fiber: '#8B5CF6',       // purple-500
  sugar: '#F97316',       // orange-500
  sodium: '#64748B',      // slate-500
  cholesterol: '#EF4444', // red-500
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
  microArcs,
  style,
  ...props
}: NutritionCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      scale.value = withSpring(1, { damping: 10, stiffness: 140 });
      opacity.value = withTiming(1, { duration: 350 });
    }, delay);
    return () => clearTimeout(timer);
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
        return { padding: Spacing.xl, minHeight: 160 };
      case 'small':
        return { 
          padding: 10, 
          height: 110, 
          justifyContent: 'center' as const,
          minWidth: 85 
        };
      default:
        return { 
          padding: Spacing.md, 
          height: 125, 
          justifyContent: 'center' as const 
        };
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'large':
        return { value: { ...TextStyles.h1, fontSize: 36 }, label: TextStyles.bodyLarge };
      case 'small':
        return { 
          value: { ...TextStyles.bodyMedium, fontSize: 16, fontWeight: '700' as const }, 
          label: { ...TextStyles.caption, fontSize: 12 } 
        };
      default:
        return { value: TextStyles.h2, label: TextStyles.body };
    }
  };

  const textStyles = getTextSize();

  const renderMicroArcs = () => {
    if (size !== 'large' || !microArcs || microArcs.length === 0) return null;
    
    const centerX = 40;
    const centerY = 40;
    const radius = 34;
    
    return (
      <View style={styles.arcsOverlay}>
        <Svg width="80" height="80" viewBox="0 0 80 80">
          <G rotation="-90" origin="40, 40">
            {microArcs.map((arc, index) => {
              const startAngle = index * 90 + 5;
              const endAngle = (index + 1) * 90 - 5;
              
              const x1 = centerX + radius * Math.cos((Math.PI * startAngle) / 180);
              const y1 = centerY + radius * Math.sin((Math.PI * startAngle) / 180);
              const x2 = centerX + radius * Math.cos((Math.PI * endAngle) / 180);
              const y2 = centerY + radius * Math.sin((Math.PI * endAngle) / 180);
              
              return (
                <Path
                  key={arc.label}
                  d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
                  stroke={arc.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.8}
                />
              );
            })}
          </G>
        </Svg>
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.card,
        getSizeStyles(),
        animatedStyle,
        style,
      ]}
      {...props}
    >
      <View style={styles.content}>
        <View style={[
          styles.iconWrapper, 
          { 
            width: size === 'large' ? 80 : size === 'small' ? 36 : 48,
            height: size === 'large' ? 80 : size === 'small' ? 36 : 48,
            marginBottom: size === 'small' ? 2 : 4,
          }
        ]}>
          {renderMicroArcs()}
          <IconSymbol 
            name={cardIcon} 
            size={size === 'large' ? 32 : size === 'small' ? 20 : 24} 
            color={cardColor} 
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[textStyles.value, { color: cardColor, fontWeight: '700' as const, lineHeight: size === 'small' ? 18 : size === 'large' ? 42 : 28 }]}>
            {typeof value === 'number' ? Number(value.toFixed(1)) : value}
            {unit && <Text style={[textStyles.label, { color: cardColor, fontSize: (textStyles.value.fontSize || 24) * 0.5, fontWeight: '400' as const }]}> {unit}</Text>}
          </Text>
          <Text 
            style={[textStyles.label, { color: colors.icon, marginTop: size === 'small' ? 0 : 2, textAlign: 'center' }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
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
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  arcsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
