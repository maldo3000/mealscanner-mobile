import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, neonGreen } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { FontFamilies, TextStyles } from '@/constants/Typography';
import { GlassCard } from './GlassCard';
import { IconSymbol } from './IconSymbol';
import { ThumbnailImage } from './OptimizedImage';

// ── Curated gradient palettes for imageless meals ──────────────
// Dark, food-inspired gradients that harmonize with the app theme.
const MEAL_GRADIENTS: readonly [string, string][] = [
  ['#0a3d2e', '#164e3b'], // deep emerald → forest
  ['#1a2e1a', '#2d4a1e'], // dark olive → mossy green
  ['#2a1f35', '#3d2045'], // deep plum → aubergine
  ['#1a2b3d', '#1e3a50'], // midnight blue → ocean
  ['#2d1e1a', '#4a2c20'], // dark chocolate → warm cocoa
  ['#0d3b3b', '#16504a'], // deep teal → jade
  ['#351a1e', '#4a252a'], // dark burgundy → merlot
  ['#1e2d1a', '#2e4428'], // dark sage → herb garden
] as const;

/** Deterministic hash → gradient index from a string */
function getGradientForTitle(title: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % MEAL_GRADIENTS.length;
  return [...MEAL_GRADIENTS[index]] as [string, string];
}

interface DiscoveryCardProps {
  type: 'recipe' | 'tip' | 'meal';
  title: string;
  subtitle: string;
  imageUrl?: string;
  recipeId?: string;
  mealId?: string;
  style?: any;
  titleStyle?: any;
  subtitleStyle?: any;
}

export function DiscoveryCard({ type, title, subtitle, imageUrl, recipeId, mealId, style, titleStyle, subtitleStyle }: DiscoveryCardProps) {
  const router = useRouter();

  // Memoize gradient so it stays stable across re-renders
  const gradientColors = useMemo(() => getGradientForTitle(title), [title]);

  const handlePress = () => {
    if (recipeId) {
      router.push(`/recipe/${recipeId}`);
    } else if (mealId) {
      router.push(`/meal/${mealId}`);
    } else {
      // Maybe navigate to a tips screen or just do nothing
    }
  };

  const badgeIcon = type === 'recipe' ? 'fork.knife' as const : type === 'meal' ? 'fork.knife' as const : 'info.circle' as const;
  const badgeLabel = type === 'recipe' ? 'Suggested for Lunch' : type === 'meal' ? 'Latest Entry' : 'Daily Tip';

  return (
    <GlassCard variant="glass" style={[styles.container, style]} padding="none">
      <TouchableOpacity 
        style={styles.touchable}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {imageUrl ? (
          <View style={styles.imageWrapper}>
            <ThumbnailImage 
              source={{ uri: imageUrl }} 
              style={styles.image}
            />
            <View style={styles.imageOverlay} />
            <View style={styles.badgeContainer}>
              <View style={styles.badge}>
                <IconSymbol name={badgeIcon} size={12} color={neonGreen} />
                <Text style={[TextStyles.caption, styles.badgeText]}>
                  {badgeLabel}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.imageWrapper}>
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Subtle radial glow behind the icon */}
            <View style={styles.placeholderGlow} />
            {/* Centered food icon */}
            <View style={styles.placeholderIconContainer}>
              <IconSymbol
                name="fork.knife"
                size={44}
                color={`${neonGreen}30`}
              />
            </View>
            {/* Badge overlay — same as the image variant */}
            <View style={styles.badgeContainer}>
              <View style={styles.badge}>
                <IconSymbol name={badgeIcon} size={12} color={neonGreen} />
                <Text style={[TextStyles.caption, styles.badgeText]}>
                  {badgeLabel}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.textContent}>
          <Text 
            style={[
              TextStyles.h4, 
              { 
                color: Colors.dark.text,
                fontFamily: FontFamilies.headingBold,
                fontWeight: Platform.OS === 'web' ? '800' : undefined,
                fontSize: 18,
              },
              titleStyle
            ]} 
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={[TextStyles.bodySmall, { color: Colors.dark.icon, marginTop: 4 }, subtitleStyle]} numberOfLines={2}>
            {subtitle}
          </Text>

          <View style={styles.footer}>
            <View style={styles.ghostButton}>
              <Text style={[TextStyles.bodySmall, { color: neonGreen, fontWeight: '600' }]}>
                {type === 'recipe' ? 'View Recipe' : type === 'meal' ? 'View Details' : 'Learn More'}
              </Text>
              <IconSymbol name="chevron.right" size={14} color={neonGreen} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  touchable: {
    width: '100%',
  },
  imageWrapper: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  badgeContainer: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 44, 34, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${neonGreen}40`,
  },
  textContent: {
    padding: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.sm,
  },
  ghostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  placeholderIconContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${neonGreen}08`,
    alignSelf: 'center',
    top: '50%',
    marginTop: -50,
  },
  badgeText: {
    color: neonGreen,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
});

