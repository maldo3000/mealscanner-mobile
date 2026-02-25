import { BlurMask, Canvas, Circle, RadialGradient, vec } from '@shopify/react-native-skia';
import React from 'react';
import { Platform, StyleSheet, Text, View, ViewProps } from 'react-native';

const IS_ANDROID = Platform.OS === 'android';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { accentCoral, accentSky, accentYellow, Colors, neonGreen, withAlpha } from '@/constants/Colors';
import { BorderRadius } from '@/constants/Layout';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from './IconSymbol';
import { MaterialSegmentRing, type SegmentData } from './skia';

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

  const iconWrapperSize = size === 'large' ? 80 : size === 'small' ? 36 : 48;
  const iconSize = size === 'large' ? 32 : size === 'small' ? 20 : 24;

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

  // Convert MicroArcData to SegmentData for the Skia ring
  const segments: SegmentData[] = microArcs?.map(arc => ({
    label: arc.label,
    value: arc.value,
    color: arc.color,
  })) || [];

  const hasSkiaRing = size === 'large' && segments.length > 0;
  const ringSize = 80;
  const ringStrokeWidth = 4;

  // Render icon bloom (subtle radial glow behind icon)
  const renderIconBloom = (): React.ReactNode => {
    // Tune bloom per card size so macros/micros get the same “light glow” treatment as Calories.
    const bloomSize = size === 'large' ? 48 : size === 'small' ? 28 : 36;
    const center = bloomSize / 2;
    const gradientStrength = size === 'small' ? 0.16 : size === 'large' ? 0.22 : 0.18;
    const blur = size === 'small' ? 6 : 8;
    const coreOpacity = size === 'small' ? 0.06 : 0.08;

    // withAlpha expects a hex color; cardColor is sourced from our palette constants (hex).
    const glowStart = withAlpha(cardColor, gradientStrength);
    const glowEnd = withAlpha(cardColor, 0);

    return (
      <View style={styles.bloomOverlay} pointerEvents="none">
        <Canvas style={{ width: bloomSize, height: bloomSize }} pointerEvents="none">
          <Circle cx={center} cy={center} r={center * 0.85}>
            <RadialGradient c={vec(center, center)} r={center * 0.85} colors={[glowStart, glowEnd]} />
          </Circle>
          <Circle cx={center} cy={center} r={center * 0.5} color={cardColor} opacity={coreOpacity}>
            {!IS_ANDROID && <BlurMask blur={blur} style="normal" />}
          </Circle>
        </Canvas>
      </View>
    );
  };

  // Render the Skia material segment ring
  const renderMaterialRing = () => {
    if (!hasSkiaRing) return null;
    
    return (
      <View style={styles.arcsOverlay}>
        <MaterialSegmentRing
          size={ringSize}
          strokeWidth={ringStrokeWidth}
          segments={segments}
          animationDuration={600}
          animationDelay={delay + 100}
        />
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
            width: iconWrapperSize,
            height: iconWrapperSize,
            marginBottom: size === 'small' ? 2 : 4,
          }
        ]}>
          {renderMaterialRing()}
          {renderIconBloom()}
          <IconSymbol 
            name={cardIcon} 
            size={iconSize} 
            color={cardColor} 
          />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[
            textStyles.value, 
            { 
              color: cardColor, 
              fontWeight: '700' as const, 
              lineHeight: size === 'small' ? 18 : size === 'large' ? 42 : 28,
              // Subtle text shadow for large cards - improves readability on textured backgrounds
              ...(size === 'large' && {
                textShadowColor: 'rgba(0, 0, 0, 0.35)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }),
            }
          ]}>
            {typeof value === 'number' ? Number(value.toFixed(1)) : value}
            {unit && <Text style={[textStyles.label, { color: cardColor, fontSize: (textStyles.value.fontSize || 24) * 0.5, fontWeight: '400' as const }]}> {unit}</Text>}
          </Text>
          <Text 
            style={[
              textStyles.label, 
              { 
                color: colors.icon, 
                marginTop: size === 'small' ? 0 : 2, 
                textAlign: 'center',
                // Slightly reduce label opacity for large cards to emphasize the value
                opacity: size === 'large' ? 0.7 : 1,
              }
            ]}
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
  bloomOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
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
