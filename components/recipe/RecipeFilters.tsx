import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, glassBorder, glassSurface, neonGreen } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  formatTagForDisplay,
  type RecipeFilters as RecipeFiltersType,
} from '@/hooks/useRecipes';

interface RecipeFiltersProps {
  filters: RecipeFiltersType;
  onOpenFilterSheet: () => void;
  onRemoveTag: (tag: string) => void;
  onRemoveMaxCalories: () => void;
  onRemoveSort: () => void;
  onClearFilters: () => void;
}

export function RecipeFilters({
  filters,
  onOpenFilterSheet,
  onRemoveTag,
  onRemoveMaxCalories,
  onRemoveSort,
  onClearFilters,
}: RecipeFiltersProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const hasActiveFilters = filters.tags.length > 0 || filters.maxCalories !== null || filters.sortBy !== 'default';

  const getSortLabel = (sort: string) => {
    switch (sort) {
      case 'calories-low': return 'Lowest Cal';
      case 'calories-high': return 'Highest Cal';
      case 'protein-high': return 'Highest Protein';
      case 'time-low': return 'Fastest';
      default: return 'Sorted';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity 
          style={[
            styles.mainFilterBtn, 
            { 
              borderColor: hasActiveFilters ? neonGreen : glassBorder,
              backgroundColor: glassSurface 
            }
          ]} 
          onPress={onOpenFilterSheet}
          activeOpacity={0.7}
        >
          <IconSymbol name="line.3.horizontal.decrease.circle" size={18} color={hasActiveFilters ? neonGreen : colors.icon} />
          <Text style={[styles.filterBtnText, { color: hasActiveFilters ? neonGreen : colors.text }]}>
            Filter{hasActiveFilters ? ` (${filters.tags.length + (filters.maxCalories ? 1 : 0) + (filters.sortBy !== 'default' ? 1 : 0)})` : ''}
          </Text>
        </TouchableOpacity>

        {/* Sort Button - Also opens filter sheet now */}
        <TouchableOpacity 
          style={[
            styles.sortBtn, 
            { 
              backgroundColor: glassSurface, 
              borderColor: filters.sortBy !== 'default' ? neonGreen : glassBorder 
            }
          ]}
          onPress={onOpenFilterSheet}
          activeOpacity={0.7}
        >
          <IconSymbol name="arrow.up.arrow.down" size={16} color={filters.sortBy !== 'default' ? neonGreen : colors.icon} />
          <Text style={[styles.filterBtnText, { color: filters.sortBy !== 'default' ? neonGreen : colors.text }]}>Sort</Text>
        </TouchableOpacity>

        {/* Active Filter Chips */}
        <View style={styles.chipsContainer}>
          {filters.sortBy !== 'default' && (
            <TouchableOpacity 
              style={styles.activeChip} 
              onPress={onRemoveSort}
              activeOpacity={0.7}
            >
              <Text style={styles.activeChipText}>{getSortLabel(filters.sortBy)}</Text>
              <IconSymbol name="xmark" size={12} color="#FFF" />
            </TouchableOpacity>
          )}
          
          {filters.maxCalories && (
            <TouchableOpacity 
              style={styles.activeChip} 
              onPress={onRemoveMaxCalories}
              activeOpacity={0.7}
            >
              <Text style={styles.activeChipText}>Under {filters.maxCalories} cal</Text>
              <IconSymbol name="xmark" size={12} color="#FFF" />
            </TouchableOpacity>
          )}

          {filters.tags.map(tag => (
            <TouchableOpacity 
              key={tag} 
              style={styles.activeChip} 
              onPress={() => onRemoveTag(tag)}
              activeOpacity={0.7}
            >
              <Text style={styles.activeChipText}>{formatTagForDisplay(tag)}</Text>
              <IconSymbol name="xmark" size={12} color="#FFF" />
            </TouchableOpacity>
          ))}
        </View>

        {hasActiveFilters && (
          <TouchableOpacity 
            style={styles.clearTextBtn} 
            onPress={onClearFilters}
            activeOpacity={0.7}
          >
            <Text style={[styles.clearText, { color: colors.icon }]}>Clear All</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: 0,
    alignItems: 'center',
    gap: 12,
  },
  mainFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterBtnText: {
    ...TextStyles.bodySmall,
    fontWeight: '700',
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  activeChipText: {
    ...TextStyles.caption,
    color: '#FFF',
    fontWeight: '600',
  },
  clearTextBtn: {
    paddingHorizontal: 8,
  },
  clearText: {
    ...TextStyles.caption,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
