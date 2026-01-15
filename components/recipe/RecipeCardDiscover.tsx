import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThumbnailImage } from '@/components/ui/OptimizedImage';
import { SourceBadge } from './SourceBadge';
import { Colors, glassSurface, accentSky, herbarium } from '@/constants/Colors';
import { TextStyles, FontFamilies } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { Recipe } from './types';

interface RecipeCardDiscoverProps {
  recipe: Recipe;
  onPress: () => void;
  isLocked?: boolean;
  size?: 'default' | 'large';
}

const formatMacro = (val: number | undefined | null) => {
  if (val === undefined || val === null) return '0';
  return Number(val.toFixed(1)).toString();
};

export function RecipeCardDiscover({ recipe, onPress, isLocked = false, size = 'default' }: RecipeCardDiscoverProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const isLarge = size === 'large';

  return (
    <TouchableOpacity 
      onPress={onPress} 
      activeOpacity={0.85} 
      style={isLarge ? styles.containerLarge : styles.container}
    >
      <Card variant="glass" padding="none" style={styles.card}>
        <View style={styles.imageContainer}>
          {recipe.image_url ? (
            <ThumbnailImage 
              source={recipe.image_url} 
              style={styles.image} 
            />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Text style={styles.placeholderText}>🍳</Text>
            </View>
          )}
          
          {/* Lock overlay for Pro recipes */}
          {isLocked && (
            <View style={styles.lockOverlay}>
              <View style={styles.lockBadge}>
                <IconSymbol name="lock.fill" size={16} color="#FFFFFF" />
                <Text style={styles.lockText}>PRO</Text>
              </View>
            </View>
          )}
          
          {!isLocked && (
            <View style={styles.badgeOverlay}>
              <SourceBadge source="discover" size={14} />
            </View>
          )}
        </View>
        
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text 
              style={[
                TextStyles.bodySmall, 
                { 
                  color: colors.text, 
                  fontFamily: FontFamilies.headingBold,
                  fontSize: 15,
                  flex: 1,
                }
              ]} 
              numberOfLines={2}
            >
              {recipe.name}
            </Text>
            {isLocked && (
              <IconSymbol name="lock.fill" size={12} color={accentSky} style={styles.titleLock} />
            )}
          </View>
          
          {/* Info below title */}
          <View style={styles.chipsContainer}>
            {recipe.nutrition_per_serving?.calories && (
              <Text style={styles.chipText}>{formatMacro(recipe.nutrition_per_serving.calories)} kcal</Text>
            )}
            {recipe.nutrition_per_serving?.calories && recipe.total_time && (
              <Text style={styles.chipText}>•</Text>
            )}
            {recipe.total_time && (
              <Text style={styles.chipText}>{recipe.total_time}</Text>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: Spacing.xs,
  },
  containerLarge: {
    width: 200,
    marginRight: Spacing.md,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: glassSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 32,
  },
  badgeOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: accentSky,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  lockText: {
    ...TextStyles.caption,
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  content: {
    padding: Spacing.sm,
    height: 72,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  titleLock: {
    marginTop: 2,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  chipText: {
    fontFamily: FontFamilies.body,
    color: herbarium.textMuted,
    fontSize: 12,
  },
});
