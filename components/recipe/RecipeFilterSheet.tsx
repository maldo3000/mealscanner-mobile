import { BlurView } from 'expo-blur';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
  Pressable,
  Platform,
} from 'react-native';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Button } from '@/components/ui/Button';
import { Colors, glassBorder, glassSurface, neonGreen, accentSky } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  formatTagForDisplay,
  getCalorieBuckets,
  type RecipeFilters as RecipeFiltersType,
  type SortOption,
  type TagCategories,
} from '@/hooks/useRecipes';

interface RecipeFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: RecipeFiltersType;
  onApply: (filters: Partial<RecipeFiltersType>) => void;
  tagCategories: TagCategories;
  remainingCalories: number | null;
}

export function RecipeFilterSheet({
  visible,
  onClose,
  filters,
  onApply,
  tagCategories,
  remainingCalories,
}: RecipeFilterSheetProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Local state to track changes before applying
  const [localTags, setLocalTags] = useState<string[]>(filters.tags);
  const [localMaxCalories, setLocalMaxCalories] = useState<number | null>(filters.maxCalories);
  const [localSortBy, setLocalSortBy] = useState<SortOption>(filters.sortBy);

  // Sync local state when visible changes
  useEffect(() => {
    if (visible) {
      setLocalTags(filters.tags);
      setLocalMaxCalories(filters.maxCalories);
      setLocalSortBy(filters.sortBy);
    }
  }, [visible, filters]);

  const toggleTag = (tag: string) => {
    const normalizedTag = tag.toLowerCase();
    setLocalTags(prev => 
      prev.some(t => t.toLowerCase() === normalizedTag)
        ? prev.filter(t => t.toLowerCase() !== normalizedTag) 
        : [...prev, normalizedTag]
    );
  };

  const handleApply = () => {
    onApply({ tags: localTags, maxCalories: localMaxCalories, sortBy: localSortBy });
    onClose();
  };

  const handleClear = () => {
    setLocalTags([]);
    setLocalMaxCalories(null);
    setLocalSortBy('default');
  };

  const calorieBuckets = useMemo(
    () => getCalorieBuckets(remainingCalories),
    [remainingCalories]
  );

  const renderSection = (title: string, icon: string, iconColor: string, content: React.ReactNode) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <IconSymbol name={icon as any} size={18} color={iconColor} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {content}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: glassBorder }]}>
          <View style={styles.indicator} />
          
          <View style={styles.header}>
            <Text style={[TextStyles.h3, { color: colors.text }]}>Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={20} color={colors.icon} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Calories Section */}
            {calorieBuckets.length > 0 && renderSection("Calories", "flame", neonGreen, (
              <View style={styles.chipsGrid}>
                {calorieBuckets.map(bucket => (
                  <TouchableOpacity
                    key={bucket}
                    style={[
                      styles.filterChip,
                      localMaxCalories === bucket && { backgroundColor: neonGreen, borderColor: neonGreen },
                      { borderColor: glassBorder }
                    ]}
                    onPress={() => setLocalMaxCalories(localMaxCalories === bucket ? null : bucket)}
                  >
                    <Text style={[styles.chipText, { color: localMaxCalories === bucket ? '#000' : colors.text }]}>
                      Under {bucket}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {/* Dietary Section */}
            {tagCategories.dietary && renderSection("Dietary", "leaf", accentSky, (
              <View style={styles.chipsGrid}>
                {tagCategories.dietary.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.filterChip,
                      localTags.some(t => t.toLowerCase() === tag.toLowerCase()) && { backgroundColor: accentSky, borderColor: accentSky },
                      { borderColor: glassBorder }
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.chipText, { color: localTags.some(t => t.toLowerCase() === tag.toLowerCase()) ? '#000' : colors.text }]}>
                      {formatTagForDisplay(tag)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {/* Goals Section */}
            {tagCategories.goals && renderSection("Goals", "target", neonGreen, (
              <View style={styles.chipsGrid}>
                {tagCategories.goals.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.filterChip,
                      localTags.some(t => t.toLowerCase() === tag.toLowerCase()) && { backgroundColor: neonGreen, borderColor: neonGreen },
                      { borderColor: glassBorder }
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.chipText, { color: localTags.some(t => t.toLowerCase() === tag.toLowerCase()) ? '#000' : colors.text }]}>
                      {formatTagForDisplay(tag)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {/* Time Section */}
            {tagCategories.speed && renderSection("Time", "clock", colors.icon, (
              <View style={styles.chipsGrid}>
                {tagCategories.speed.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.filterChip,
                      localTags.some(t => t.toLowerCase() === tag.toLowerCase()) && { backgroundColor: accentSky, borderColor: accentSky },
                      { borderColor: glassBorder }
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.chipText, { color: localTags.some(t => t.toLowerCase() === tag.toLowerCase()) ? '#000' : colors.text }]}>
                      {formatTagForDisplay(tag)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {/* Meal Type Section */}
            {tagCategories.mealType && renderSection("Meal Type", "fork.knife", colors.icon, (
              <View style={styles.chipsGrid}>
                {tagCategories.mealType.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.filterChip,
                      localTags.some(t => t.toLowerCase() === tag.toLowerCase()) && { backgroundColor: accentSky, borderColor: accentSky },
                      { borderColor: glassBorder }
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.chipText, { color: localTags.some(t => t.toLowerCase() === tag.toLowerCase()) ? '#000' : colors.text }]}>
                      {formatTagForDisplay(tag)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            {/* Sort Section */}
            {renderSection("Sort By", "arrow.up.arrow.down", colors.icon, (
              <View style={styles.chipsGrid}>
                {[
                  { id: 'default', label: 'Recommended' },
                  { id: 'calories-low', label: 'Lowest Calories' },
                  { id: 'calories-high', label: 'Highest Calories' },
                  { id: 'protein-high', label: 'Highest Protein' },
                  { id: 'time-low', label: 'Fastest Prep' },
                ].map(option => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.filterChip,
                      localSortBy === option.id && { backgroundColor: neonGreen, borderColor: neonGreen },
                      { borderColor: glassBorder }
                    ]}
                    onPress={() => setLocalSortBy(option.id as any)}
                  >
                    <Text style={[styles.chipText, { color: localSortBy === option.id ? '#000' : colors.text }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Footer Actions */}
          <BlurView intensity={80} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={styles.footer}>
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
              <Text style={[TextStyles.button, { color: colors.icon }]}>Clear All</Text>
            </TouchableOpacity>
            <Button 
              variant="primary" 
              style={styles.applyBtn}
              onPress={handleApply}
            >
              <Text style={[TextStyles.button, { color: '#000' }]}>Apply Filters</Text>
            </Button>
          </BlurView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    height: '85%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 12,
    overflow: 'hidden',
  },
  indicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    ...TextStyles.body,
    fontWeight: '700',
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: glassSurface,
  },
  chipText: {
    ...TextStyles.bodySmall,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: glassBorder,
  },
  clearBtn: {
    flex: 1,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtn: {
    flex: 2,
    height: 54,
  },
});

