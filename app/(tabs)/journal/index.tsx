import { useQueryClient } from '@tanstack/react-query';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThumbnailImage } from '@/components/ui/OptimizedImage';
import { Colors, glassBorder, glassSurface, neonGreen, primaryGreen } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { FontFamilies, TextStyles } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useMealsQuery } from '@/hooks/queries/useMealsQuery';
import { queryKeys } from '@/lib/queryKeys';
import { deleteMeal } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeInDown, interpolate, SharedValue, useAnimatedStyle } from 'react-native-reanimated';

// Row height for getItemLayout optimization (row height + separator)
const COMPACT_ROW_HEIGHT = 100;
const SEPARATOR_HEIGHT = 1;
const ITEM_HEIGHT = COMPACT_ROW_HEIGHT + SEPARATOR_HEIGHT;

// Stable functions for FlatList optimization
const keyExtractor = (item: Meal) => item.id;
const getItemLayout = (_data: ArrayLike<Meal> | null | undefined, index: number) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
});
const ItemSeparator = () => <View style={styles.compactSeparator} />;

interface Meal {
  id: string;
  description: string;
  image_url?: string;
  user_id: string;
  items_count?: number;
  ingredients?: string[];
  serving_estimate?: string;
  calories?: number;
  macros?: {
    protein?: number;
    fat?: number;
    carbs?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    cholesterol?: number;
  };
  health_score?: 'very_healthy' | 'healthy' | 'needs_improvement';
  fiber_score?: string;
  qualitative_feedback?: string;
  recipe?: string;
  created_at: string;
  meal_type?: string;
  // AI Analysis fields
  ai_analysis?: any;
  nutrition_confidence?: number;
  analysis_version?: string;
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
}

type SelectedFilter = 'today' | 'week' | 'month';

interface MealTotals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

// Extracted swipe delete action component for better performance
interface SwipeDeleteActionProps {
  progress: SharedValue<number>;
  mealId: string;
  onDelete: (id: string) => void;
}

function SwipeDeleteAction({ progress, mealId, onDelete }: SwipeDeleteActionProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [0.8, 1], 'clamp');
    const opacity = interpolate(progress.value, [0, 0.5, 1], [0, 0, 1], 'clamp');
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <View style={styles.rightActionContainer}>
      <Animated.View style={[styles.deleteAction, animatedStyle]}>
        <TouchableOpacity
          style={styles.deleteActionContent}
          activeOpacity={0.8}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDelete(mealId);
          }}
        >
          <IconSymbol name="trash.fill" size={20} color="white" />
          <Text style={styles.deleteActionText}>Delete</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function MealsScreen() {
  const { user } = useAuth();
  const { isPro, showPaywall } = useSubscription();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const queryClient = useQueryClient();

  const daysLimit = isPro ? 30 : 7;
  const fetchLimit = isPro ? 150 : 50;

  const {
    meals,
    isLoading: loading,
    isRefetching: refreshing,
    refetch: refetchMeals,
  } = useMealsQuery({ userId: user?.id, daysLimit, limit: fetchLimit, journalMode: true });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<SelectedFilter>('today');

  // Track if we should animate rows (only on initial data load, not filter changes)
  const shouldAnimateRows = useRef(true);
  const lastFilterRef = useRef<SelectedFilter>(selectedFilter);

  const resolveMealTitle = useCallback((meal: Meal): string => {
    const aiName = typeof meal.ai_analysis?.name === 'string' ? meal.ai_analysis.name.trim() : '';
    if (aiName.length >= 3 && aiName.length <= 60) {
      return aiName;
    }
    const description = meal.description?.trim();
    return description?.length ? description : 'Meal';
  }, []);

  // Helper to format macro values to 1 decimal point max, removing trailing .0
  const formatMacro = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '0';
    return Number(val.toFixed(1)).toString();
  };

  // Refresh data when screen is focused (React Query handles staleness)
  useFocusEffect(
    useCallback(() => {
      void refetchMeals();
    }, [refetchMeals])
  );

  const onRefresh = useCallback(async () => {
    await refetchMeals();
  }, [refetchMeals]);

  const handleDeleteMeal = useCallback((mealId: string) => {
    Alert.alert(
      'Delete Meal',
      'Are you sure you want to delete this meal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Optimistic update: remove from cache immediately
              const userId = user?.id;
              if (userId) {
                queryClient.setQueriesData<Meal[]>(
                  { queryKey: queryKeys.meals.all(userId) },
                  (old) => old?.filter(meal => meal.id !== mealId),
                );
              }

              const { error } = await deleteMeal(mealId);
              if (error) {
                Alert.alert('Error', 'Failed to delete meal');
                // Revert optimistic update
                if (userId) {
                  void queryClient.invalidateQueries({ queryKey: queryKeys.meals.all(userId) });
                }
                return;
              }

              // Invalidate to sync all query variants (home + journal use different keys)
              if (userId) {
                void queryClient.invalidateQueries({ queryKey: queryKeys.meals.all(userId) });
              }
            } catch (error) {
              console.error('Delete exception:', error);
              Alert.alert('Error', 'Failed to delete meal');
              if (user?.id) {
                void queryClient.invalidateQueries({ queryKey: queryKeys.meals.all(user.id) });
              }
            }
          }
        }
      ]
    );
  }, [user?.id, queryClient]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const { filteredMeals, totals } = useMemo((): { filteredMeals: Meal[]; totals: MealTotals } => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const nextFilteredMeals = meals.filter((meal) => {
      if (normalizedQuery) {
        const haystack = resolveMealTitle(meal).toLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }

      const mealDate = new Date(meal.created_at);

      if (selectedFilter === 'today') {
        return mealDate >= todayStart;
      }

      if (selectedFilter === 'week') {
        return mealDate >= weekStart;
      }

      return mealDate >= monthStart;
    });

    const nextTotals = nextFilteredMeals.reduce<MealTotals>(
      (acc, meal) => {
        acc.calories += meal.calories || 0;
        acc.protein += meal.macros?.protein || 0;
        acc.fat += meal.macros?.fat || 0;
        acc.carbs += meal.macros?.carbs || 0;
        return acc;
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );

    return { filteredMeals: nextFilteredMeals, totals: nextTotals };
  }, [meals, resolveMealTitle, searchQuery, selectedFilter]);

  const handleSelectFilter = useCallback((nextFilter: SelectedFilter) => {
    if (nextFilter === lastFilterRef.current) return;
    // Skip animations when switching filters for instant feedback
    shouldAnimateRows.current = false;
    lastFilterRef.current = nextFilter;
    setSelectedFilter(nextFilter);
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
  }, []);

  // Memoized delete action renderer for swipeable
  const renderRightActions = useCallback((progress: SharedValue<number>, mealId: string) => {
    return (
      <SwipeDeleteAction 
        progress={progress} 
        mealId={mealId} 
        onDelete={handleDeleteMeal} 
      />
    );
  }, [handleDeleteMeal]);

  const renderCompactMealRow = useCallback(({ item: meal, index }: { item: Meal, index: number }) => {
    // Only animate on initial load, not on filter changes
    const entering = shouldAnimateRows.current 
      ? FadeInDown.delay(Math.min(index, 6) * 15).springify().damping(20).stiffness(90)
      : undefined;

    return (
      <Animated.View entering={entering}>
        <ReanimatedSwipeable
          renderRightActions={(progress) => renderRightActions(progress, meal.id)}
          friction={2}
          rightThreshold={40}
          containerStyle={styles.swipeableContainer}
        >
          <TouchableOpacity
            style={[styles.compactRow, { backgroundColor: 'transparent' }]}
            onPress={() => router.push(`/meal/${meal.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.compactImageContainer}>
              {meal.image_url ? (
                <ThumbnailImage 
                  source={{ uri: meal.image_url }} 
                  style={styles.compactImage} 
                />
              ) : (
                <View style={[styles.compactImagePlaceholder, { backgroundColor: colors.border }]}>
                  <IconSymbol name="fork.knife" size={24} color={colors.icon} />
                </View>
              )}
            </View>

            <View style={styles.compactContent}>
              <Text 
                style={[
                  TextStyles.body, 
                  { 
                    color: colors.text, 
                    fontFamily: FontFamilies.headingBold,
                    fontWeight: Platform.OS === 'web' ? '800' : undefined,
                    fontSize: 17,
                    marginBottom: 2 
                  }
                ]} 
                numberOfLines={2}
              >
                {resolveMealTitle(meal)}
              </Text>
              
              <Text style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: 8 }]}>
                {formatDate(meal.created_at)}
              </Text>
              
              <View style={styles.compactMeta}>
                <View style={styles.macroBadge}>
                  <Text style={[TextStyles.bodySmall, { color: primaryGreen, fontWeight: '700' }]}>
                    {formatMacro(meal.calories)}
                  </Text>
                  <Text style={[TextStyles.caption, { color: colors.icon, fontSize: 10 }]}>kcal</Text>
                </View>
                <View style={styles.macroBadge}>
                  <Text style={[TextStyles.bodySmall, { color: colors.text, fontWeight: '600' }]}>
                    {formatMacro(meal.macros?.protein)}g
                  </Text>
                  <Text style={[TextStyles.caption, { color: colors.icon, fontSize: 10 }]}>pro</Text>
                </View>
                <View style={styles.macroBadge}>
                  <Text style={[TextStyles.bodySmall, { color: colors.text, fontWeight: '600' }]}>
                    {formatMacro(meal.macros?.carbs)}g
                  </Text>
                  <Text style={[TextStyles.caption, { color: colors.icon, fontSize: 10 }]}>carb</Text>
                </View>
                <View style={styles.macroBadge}>
                  <Text style={[TextStyles.bodySmall, { color: colors.text, fontWeight: '600' }]}>
                    {formatMacro(meal.macros?.fat)}g
                  </Text>
                  <Text style={[TextStyles.caption, { color: colors.icon, fontSize: 10 }]}>fat</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </ReanimatedSwipeable>
      </Animated.View>
    );
  }, [colors, renderRightActions, resolveMealTitle, router]);

  return (
    <PageContainer>
      <PageHeader
        title="Journal"
        subtitle="Your history of captured meals"
      />

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: glassSurface, borderColor: glassBorder, borderWidth: 1 }]}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.icon} />
          <TextInput
            style={[TextStyles.body, { color: colors.text, flex: 1 }]}
            placeholder="Search meals..."
            placeholderTextColor={colors.icon}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterButtons}>
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              { backgroundColor: glassSurface, borderColor: glassBorder, borderWidth: 1 },
              selectedFilter === 'today' && styles.filterButtonActive
            ]}
            activeOpacity={0.85}
            onPress={() => handleSelectFilter('today')}
          >
            <Text style={[TextStyles.button, { color: selectedFilter === 'today' ? '#000000' : colors.text }]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              { backgroundColor: glassSurface, borderColor: glassBorder, borderWidth: 1 },
              selectedFilter === 'week' && styles.filterButtonActive
            ]}
            activeOpacity={0.85}
            onPress={() => handleSelectFilter('week')}
          >
            <Text style={[TextStyles.button, { color: selectedFilter === 'week' ? '#000000' : colors.text }]}>
              This Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              { backgroundColor: glassSurface, borderColor: glassBorder, borderWidth: 1 },
              selectedFilter === 'month' && styles.filterButtonActive
            ]}
            activeOpacity={0.85}
            onPress={() => handleSelectFilter('month')}
          >
            <Text style={[TextStyles.button, { color: selectedFilter === 'month' ? '#000000' : colors.text }]}>
              Month
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Free-tier history nudge */}
      {!isPro && selectedFilter === 'month' && (
        <TouchableOpacity
          style={[styles.proNudgeBanner, { backgroundColor: glassSurface, borderColor: glassBorder }]}
          activeOpacity={0.7}
          onPress={() => void showPaywall()}
          accessibilityLabel="Upgrade to Pro for full month history"
          accessibilityRole="button"
        >
          <IconSymbol name="lock.fill" size={14} color={primaryGreen} />
          <View style={{ flex: 1 }}>
            <Text style={[TextStyles.bodySmall, { color: colors.icon, fontWeight: '600' }]}>
              Showing your last 7 days
            </Text>
            <Text style={[TextStyles.caption, { color: colors.icon, marginTop: 1, opacity: 0.8 }]}>
              To see all data, subscribe to Pro
            </Text>
          </View>
          <Text style={[TextStyles.bodySmall, { color: primaryGreen, fontWeight: '700' }]}>
            Upgrade to Pro
          </Text>
          <IconSymbol name="chevron.right" size={12} color={primaryGreen} />
        </TouchableOpacity>
      )}

      {/* Summary Card */}
      {(selectedFilter === 'today' || selectedFilter === 'week') && filteredMeals.length > 0 && (
        <Animated.View entering={FadeInDown.duration(400)}>
          <Card variant="glass" style={styles.summaryCard}>
            <View style={styles.summaryContent}>
              <View>
                <Text style={[TextStyles.caption, { color: colors.icon, letterSpacing: 0.5, marginBottom: 4 }]}>
                  {selectedFilter === 'today' ? "TODAY'S TOTAL" : "WEEK'S TOTAL"}
                </Text>
                <View style={styles.summaryCalorieRow}>
                  <Text style={[TextStyles.h1, { color: primaryGreen, fontWeight: '800' }]}>
                    {formatMacro(totals.calories)}
                  </Text>
                  <Text style={[TextStyles.body, { color: colors.icon, marginLeft: 6, marginBottom: 6 }]}>
                    kcal
                  </Text>
                </View>
              </View>
              
              <View style={styles.summaryMacros}>
                <View style={styles.summaryMacroItem}>
                  <Text style={[TextStyles.caption, { color: colors.icon, fontSize: 10, marginBottom: 2 }]}>Pro</Text>
                  <Text style={[TextStyles.bodySmall, { color: colors.text, fontWeight: '700' }]}>{formatMacro(totals.protein)}g</Text>
                </View>
                <View style={styles.summaryMacroItem}>
                  <Text style={[TextStyles.caption, { color: colors.icon, fontSize: 10, marginBottom: 2 }]}>Carb</Text>
                  <Text style={[TextStyles.bodySmall, { color: colors.text, fontWeight: '700' }]}>{formatMacro(totals.carbs)}g</Text>
                </View>
                <View style={styles.summaryMacroItem}>
                  <Text style={[TextStyles.caption, { color: colors.icon, fontSize: 10, marginBottom: 2 }]}>Fat</Text>
                  <Text style={[TextStyles.bodySmall, { color: colors.text, fontWeight: '700' }]}>{formatMacro(totals.fat)}g</Text>
                </View>
              </View>
            </View>
          </Card>
        </Animated.View>
      )}

      {/* Meals List */}
      {loading ? (
          <View style={styles.compactList}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={styles.skeletonRow}>
                <View style={[styles.skeletonImage, { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.border, opacity: 0.3 }]} />
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={[styles.skeletonText, { width: '60%', height: 20, backgroundColor: colors.border, opacity: 0.3 }]} />
                  <View style={[styles.skeletonText, { width: '40%', height: 14, backgroundColor: colors.border, opacity: 0.3 }]} />
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                    {[1, 2, 3, 4].map(j => (
                      <View key={j} style={[styles.skeletonText, { width: 40, height: 16, backgroundColor: colors.border, opacity: 0.3 }]} />
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </View>
      ) : filteredMeals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="plus.circle" size={48} color={colors.icon} />
          <Text style={[TextStyles.h4, { color: colors.text, textAlign: 'center' }]}>
            {searchQuery || selectedFilter !== 'month' ? 'No meals found' : 'No meals logged yet'}
          </Text>
          <Text style={[TextStyles.body, { color: colors.icon, textAlign: 'center', lineHeight: 24 }]}>
            {searchQuery || selectedFilter !== 'month' 
              ? 'Try adjusting your search or filter' 
              : 'Start by capturing your first meal'
            }
          </Text>
          {(!searchQuery && selectedFilter === 'month') && (
            <Button
              variant="primary"
              onPress={() => router.push('/(tabs)/log')}
              style={styles.captureButton}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <IconSymbol name="camera" size={20} color="white" />
                <Text style={[TextStyles.button, { color: 'white' }]}>Capture Meal</Text>
              </View>
            </Button>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredMeals}
          renderItem={renderCompactMealRow}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.compactList}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={ItemSeparator}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          // Performance optimizations
          removeClippedSubviews={Platform.OS !== 'web'}
          maxToRenderPerBatch={10}
          windowSize={5}
          initialNumToRender={8}
          getItemLayout={getItemLayout}
        />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: PageSpacing.containerPadding,
    gap: Spacing.base,
  },
  searchContainer: {
    marginBottom: Spacing.base,
    flexDirection: 'row',
    gap: Spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 12,
  },
  filtersContainer: {
    marginBottom: PageSpacing.containerPadding,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterButton: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: neonGreen,
    borderColor: neonGreen,
  },
  summaryCard: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: Spacing.lg,
    borderRadius: 24,
  },
  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryCalorieRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  summaryMacros: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryMacroItem: {
    alignItems: 'center',
  },
  compactList: {
    paddingBottom: 100,
  },
  swipeableContainer: {
    overflow: 'hidden',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.base,
  },
  compactImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  compactImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  compactImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactContent: {
    flex: 1,
    gap: 2,
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  macroBadge: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  compactSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginLeft: 96,
  },
  skeletonRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    gap: Spacing.base,
    alignItems: 'center',
  },
  skeletonImage: {
    borderRadius: 16,
  },
  skeletonText: {
    borderRadius: 4,
  },
  captureButton: {
    marginTop: 8,
  },
  proNudgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: Spacing.base,
    minHeight: 44,
  },
  rightActionContainer: {
    width: 90,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '80%', // Slightly shorter than the row for better aesthetic
    borderRadius: 20,
  },
  deleteActionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteActionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: FontFamilies.headingBold,
  },
});
