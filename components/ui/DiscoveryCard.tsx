import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { Colors, neonGreen, glassBorder, glassSurface } from '@/constants/Colors';
import { FontFamilies, TextStyles } from '@/constants/Typography';
import { Spacing } from '@/constants/Spacing';
import { IconSymbol } from './IconSymbol';
import { GlassCard } from './GlassCard';
import { ThumbnailImage } from './OptimizedImage';

interface DiscoveryCardProps {
  type: 'recipe' | 'tip' | 'meal';
  title: string;
  subtitle: string;
  imageUrl?: string;
  recipeId?: string;
  mealId?: string;
}

export function DiscoveryCard({ type, title, subtitle, imageUrl, recipeId, mealId }: DiscoveryCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (recipeId) {
      router.push(`/recipe/${recipeId}`);
    } else if (mealId) {
      router.push(`/meal/${mealId}`);
    } else {
      // Maybe navigate to a tips screen or just do nothing
    }
  };

  return (
    <GlassCard variant="glass" style={styles.container} padding="none">
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
                <IconSymbol 
                  name={type === 'recipe' ? 'fork.knife' : type === 'meal' ? 'clock.fill' : 'info.circle'} 
                  size={12} 
                  color={neonGreen} 
                />
                <Text style={[TextStyles.caption, { color: neonGreen, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700' }]}>
                  {type === 'recipe' ? 'Suggested for Lunch' : type === 'meal' ? 'Latest Entry' : 'Daily Tip'}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.imageWrapper, styles.placeholderImage]}>
            <IconSymbol name={type === 'recipe' ? 'fork.knife' : type === 'meal' ? 'clock.fill' : 'info.circle'} size={32} color={glassBorder} />
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
              }
            ]} 
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={[TextStyles.bodySmall, { color: Colors.dark.icon, marginTop: 4 }]} numberOfLines={2}>
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
  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: glassSurface,
  },
});

