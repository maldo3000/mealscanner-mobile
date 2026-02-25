import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { accentCoral, accentSky, accentYellow, bgPrimary, glassBorder, glassSurface, neonGreen, textMuted } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { getMealTag, type NutritionData, type TagConfig } from '@/lib/nutritionTags';

// Import the logo
const logoImage = require('@/assets/images/mealscanner-logo.png');

// Card dimensions - 9:16 aspect ratio for Stories
export const SHARE_CARD_WIDTH = 1080;
export const SHARE_CARD_HEIGHT = 1920;

// Layout constants
const OUTER_PADDING = 48;
const PHOTO_CARD_HEIGHT = SHARE_CARD_HEIGHT * 0.48;

export interface MealShareCardProps {
  /** Meal title / name */
  mealName: string;
  /** URL of the meal hero image (optional) */
  imageUrl?: string;
  /** Meal description */
  description?: string;
  /** Nutrition data for tag calculation and stats display */
  nutrition?: NutritionData & {
    fiber?: number;
  };
  /** Override the auto-calculated tag */
  tagOverride?: TagConfig;
  /** Whether to show nutrition stats (calories, protein, etc.) */
  showStats?: boolean;
  /** Meal type label (e.g., "Breakfast", "Lunch") */
  mealType?: string;
  /** Created at timestamp for date display */
  createdAt?: string;
}

/**
 * MealShareCard - A shareable card component designed for social sharing.
 * Renders at 1080x1920 (9:16 Stories aspect ratio) and uses MealScanner's
 * neon-green + glass aesthetic.
 * 
 * Layout: Photo in rounded card at top, glass info card overlapping,
 * description and CTA below.
 */
export function MealShareCard({
  mealName,
  imageUrl,
  description,
  nutrition,
  tagOverride,
  showStats = true,
  mealType,
  createdAt,
}: MealShareCardProps) {
  const tag = tagOverride ?? getMealTag(nutrition ?? null);

  const formatMacro = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '0';
    return Math.round(val).toString();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#0a3d2e', bgPrimary, bgPrimary]}
        locations={[0, 0.4, 1]}
        style={styles.backgroundGradient}
      />

      {/* Top Branding - Centered */}
      <View style={styles.brandingTop}>
        <Image
          source={logoImage}
          style={styles.logoSmall}
          resizeMode="contain"
        />
        <Text style={styles.brandText}>MealScanner</Text>
      </View>

      {/* Photo Card - Rounded container for image */}
      {imageUrl && (
        <View style={styles.photoCardContainer}>
          <View style={styles.photoCard}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.photoImage}
              resizeMode="cover"
            />
          </View>
        </View>
      )}

      {/* Glass Info Card - Positioned to overlap photo card */}
      <View style={styles.cardContainer}>
        <View style={styles.mainCard}>
          {/* Meal Type Badge */}
          {mealType && (
            <View style={styles.mealTypeBadge}>
              <Text style={styles.mealTypeText}>{mealType}</Text>
            </View>
          )}

          {/* Meal Name */}
          <Text style={styles.mealName} numberOfLines={2}>
            {mealName}
          </Text>

          {/* Tag Badge + Date Row */}
          <View style={styles.tagDateRow}>
            <View style={[styles.tagBadge, { backgroundColor: tag.color }]}>
              <Text style={styles.tagText}>{tag.label}</Text>
            </View>
            {createdAt && (
              <Text style={styles.dateText}>{formatDate(createdAt)}</Text>
            )}
          </View>

          {/* Nutrition Stats */}
          {showStats && nutrition && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: neonGreen }]}>{formatMacro(nutrition.calories)}</Text>
                <Text style={styles.statLabel}>calories</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: accentSky }]}>{formatMacro(nutrition.protein)}g</Text>
                <Text style={styles.statLabel}>protein</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: accentYellow }]}>{formatMacro(nutrition.carbs)}g</Text>
                <Text style={styles.statLabel}>carbs</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: accentCoral }]}>{formatMacro(nutrition.fat)}g</Text>
                <Text style={styles.statLabel}>fat</Text>
              </View>
            </View>
          )}
        </View>

        {/* Description - directly under the card */}
        {description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.description} numberOfLines={3}>
              {description}
            </Text>
          </View>
        )}

        {/* CTA - keep close to description */}
        <View style={styles.bottomSection}>
          <Text style={styles.ctaText}>Download at</Text>
          <Text style={styles.urlText}>mealscanner.app</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    backgroundColor: bgPrimary,
    overflow: 'hidden',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  brandingTop: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    zIndex: 10,
  },
  logoSmall: {
    width: 48,
    height: 48,
  },
  brandText: {
    ...TextStyles.h2,
    color: '#FFFFFF',
    fontSize: 30,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  photoCardContainer: {
    position: 'absolute',
    top: 200,
    left: OUTER_PADDING,
    right: OUTER_PADDING,
    height: PHOTO_CARD_HEIGHT,
  },
  photoCard: {
    flex: 1,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#0a3d2e',
    borderWidth: 3,
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  cardContainer: {
    position: 'absolute',
    top: 200 + PHOTO_CARD_HEIGHT - 120,
    left: OUTER_PADDING + 24,
    right: OUTER_PADDING + 24,
  },
  mainCard: {
    backgroundColor: glassSurface,
    borderRadius: 44,
    paddingTop: Spacing.xl * 1.5,
    paddingBottom: Spacing.xl * 1.5,
    paddingHorizontal: Spacing.xl * 1.5,
    borderWidth: 2,
    borderColor: glassBorder,
    alignItems: 'center',
  },
  mealTypeBadge: {
    backgroundColor: `${neonGreen}30`,
    paddingHorizontal: Spacing.lg + 4,
    paddingTop: Spacing.sm + 6,
    paddingBottom: Spacing.sm + 2,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: neonGreen,
    marginBottom: Spacing.md,
  },
  mealTypeText: {
    ...TextStyles.bodySmall,
    color: neonGreen,
    fontWeight: '600',
    fontSize: 24,
    lineHeight: 28,
  },
  mealName: {
    ...TextStyles.h1,
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 50,
    lineHeight: 62,
    maxWidth: '100%',
    marginBottom: Spacing.lg,
  },
  tagDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    flexWrap: 'wrap',
    marginBottom: Spacing.xl,
  },
  tagBadge: {
    paddingHorizontal: Spacing.lg + 4,
    paddingTop: Spacing.sm + 6,
    paddingBottom: Spacing.sm + 2,
    borderRadius: 28,
  },
  tagText: {
    ...TextStyles.bodyMedium,
    color: '#000000',
    fontWeight: '700',
    fontSize: 26,
    lineHeight: 30,
  },
  dateText: {
    ...TextStyles.bodySmall,
    color: textMuted,
    fontSize: 24,
    lineHeight: 28,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: 28,
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: Spacing.xs,
  },
  statValue: {
    ...TextStyles.h2,
    fontSize: 46,
    lineHeight: 54,
    fontWeight: '800',
  },
  statLabel: {
    ...TextStyles.caption,
    color: textMuted,
    fontSize: 24,
    lineHeight: 28,
    marginTop: 6,
  },
  statDivider: {
    width: 1,
    height: 48,
    backgroundColor: glassBorder,
  },
  descriptionContainer: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  description: {
    ...TextStyles.body,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    fontSize: 34,
    lineHeight: 48,
  },
  bottomSection: {
    alignItems: 'center',
    marginTop: Spacing.md, // ~“pinky width” under description
  },
  ctaText: {
    ...TextStyles.body,
    color: textMuted,
    fontSize: 24,
    lineHeight: 28,
  },
  urlText: {
    ...TextStyles.h3,
    color: neonGreen,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
  },
});
