import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '@/components/ui/Card';
import { ThumbnailImage } from '@/components/ui/OptimizedImage';
import { SourceBadge } from './SourceBadge';
import { Colors, neonGreen, glassSurface, glassBorder } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { Recipe } from './types';

interface RecipeCardDiscoverProps {
  recipe: Recipe;
  onPress: () => void;
}

export function RecipeCardDiscover({ recipe, onPress }: RecipeCardDiscoverProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity 
      onPress={onPress} 
      activeOpacity={0.85} 
      style={styles.container}
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
          
          <View style={styles.badgeOverlay}>
            <SourceBadge source="discover" size={14} />
          </View>

          <View style={styles.pillsContainer}>
            {recipe.nutrition_per_serving?.calories && (
              <View style={styles.pill}>
                <Text style={styles.pillText}>{Math.round(recipe.nutrition_per_serving.calories)} kcal</Text>
              </View>
            )}
            {recipe.total_time && (
              <View style={styles.pill}>
                <Text style={styles.pillText}>{recipe.total_time}</Text>
              </View>
            )}
          </View>
        </View>
        
        <View style={styles.content}>
          <Text style={[TextStyles.bodySmall, { color: colors.text, fontWeight: '600' }]} numberOfLines={2}>
            {recipe.name}
          </Text>
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
  pillsContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    gap: 4,
  },
  pill: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pillText: {
    ...TextStyles.caption,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    padding: Spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
});



