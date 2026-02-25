import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThumbnailImage } from '@/components/ui/OptimizedImage';
import { accentSky, Colors, neonGreen } from '@/constants/Colors';
import { FontFamilies, TextStyles } from '@/constants/Typography';
import { getRecipeImageSource } from '@/data/recipeImages';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SourceBadge } from './SourceBadge';
import type { Recipe } from './types';

interface RecipeCardAIProps {
  recipe: Recipe;
  onPress: () => void;
}

const formatMacro = (val: number | undefined | null) => {
  if (val === undefined || val === null) return '0';
  return Number(val.toFixed(1)).toString();
};

export function RecipeCardAI({ recipe, onPress }: RecipeCardAIProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const source = recipe.source_type === 'text' ? 'ai' : 'scanned';

  return (
    <TouchableOpacity 
      onPress={onPress} 
      activeOpacity={0.7} 
      style={styles.container}
    >
      <View style={styles.layout}>
        {/* Circular Thumbnail */}
        <View style={styles.imageWrapper}>
          {(recipe.image_url || recipe.id) ? (
            <ThumbnailImage 
              source={getRecipeImageSource(recipe.id, recipe.image_url) || recipe.image_url} 
              style={styles.image} 
            />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <IconSymbol name={source === 'ai' ? 'sparkles' : 'camera'} size={20} color={colors.icon} />
            </View>
          )}
          {/* Subtle Source Badge Overlay */}
          <View style={styles.badgeOverlay}>
            <SourceBadge source={source} size={10} />
          </View>
        </View>
        
        <View style={styles.content}>
          <View style={styles.header}>
            <Text 
              style={[
                TextStyles.body, 
                { 
                  color: colors.text, 
                  fontFamily: FontFamilies.headingBold,
                  fontSize: 17,
                }
              ]} 
              numberOfLines={2}
            >
              {recipe.name}
            </Text>
            
            <View style={styles.metaRow}>
              {recipe.total_time && (
                <View style={styles.metaItem}>
                  <IconSymbol name="clock" size={12} color={colors.icon} />
                  <Text style={styles.metaText}>{recipe.total_time}</Text>
                </View>
              )}
              {recipe.nutrition_per_serving?.calories && (
                <View style={styles.metaItem}>
                  <IconSymbol name="flame" size={12} color={neonGreen} />
                  <Text style={styles.metaText}>{formatMacro(recipe.nutrition_per_serving.calories)} kcal</Text>
                </View>
              )}
            </View>
          </View>

          {recipe.ai_analysis?.reasoning && (
            <Text style={styles.reasoning} numberOfLines={1}>
              {recipe.ai_analysis.reasoning}
            </Text>
          )}
        </View>

        <IconSymbol name="chevron.right" size={18} color="rgba(255, 255, 255, 0.2)" />
      </View>
      
      {/* Subtle divider like in journal */}
      <View style={[styles.divider, { backgroundColor: colors.border, opacity: 0.2 }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  layout: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    gap: 16,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 30, // Perfect circle
  },
  placeholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOverlay: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderWidth: 2,
    borderColor: '#022c22', // Match background to make it pop
    borderRadius: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  header: {
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...TextStyles.caption,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  reasoning: {
    ...TextStyles.caption,
    color: accentSky,
    fontWeight: '500',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: 4,
  },
});
