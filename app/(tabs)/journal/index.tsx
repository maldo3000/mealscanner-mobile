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
import { useColorScheme } from '@/hooks/useColorScheme';
import { deleteMeal, getUserMeals } from '@/lib/supabase';
import { useSubscription } from '@/context/SubscriptionContext';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform,
    Animated as RNAnimated
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import Animated, { Easing, FadeInDown, LinearTransition } from 'react-native-reanimated';

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

export default function MealsScreen() {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'today' | 'week' | 'all'>('today');
  // Always use compact list view for the journal
  const viewMode = 'compact';

  const isFirstLoad = useRef(true);

  // Helper to format macro values to 1 decimal point max, removing trailing .0
  const formatMacro = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '0';
    return Number(val.toFixed(1)).toString();
  };

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (user) {
        // Only show skeleton on very first load of the session
        // Note: meals.length is read inside but not a dependency - we only want to
        // re-run on focus or user change, not when meals array changes
        const shouldShowSkeleton = isFirstLoad.current && meals.length === 0;
        loadMeals(user.id, shouldShowSkeleton);
        isFirstLoad.current = false;
      } else {
        setMeals([]);
        setLoading(false);
      }
    }, [user])
  );

  const loadMeals = async (userId: string, showSkeleton = false) => {
    if (showSkeleton) setLoading(true);
    try {
      console.log('🔍 Journal: Loading meals for user ID:', userId, 'showSkeleton:', showSkeleton);
      // Free users are limited to 7 days of history
      const daysLimit = isPro ? undefined : 7;
      const { data, error } = await getUserMeals(userId, 50, daysLimit);
      if (error) {
        console.error('Error loading meals:', error);
        if (showSkeleton) Alert.alert('Error', 'Failed to load meals');
        return;
      }
      setMeals(data || []);
    } catch (error) {
      console.error('Error loading meals:', error);
      if (showSkeleton) Alert.alert('Error', 'Failed to load meals');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await loadMeals(user.id, false);
    setRefreshing(false);
  }, [user]);

  const handleDeleteMeal = async (mealId: string) => {
    console.log('🗑️ Journal: Delete button pressed for meal ID:', mealId);
    Alert.alert(
      'Delete Meal',
      'Are you sure you want to delete this meal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log('🗑️ Journal: User confirmed delete for meal ID:', mealId);
            try {
              console.log('🗑️ Journal: Calling deleteMeal function...');
              const { error } = await deleteMeal(mealId);
              if (error) {
                console.error('🗑️ Journal: Delete error:', error);
                Alert.alert('Error', 'Failed to delete meal');
                return;
              }
              console.log('🗑️ Journal: Delete successful, updating UI...');
              setMeals(meals.filter(meal => meal.id !== mealId));
              console.log('🗑️ Journal: UI updated');
            } catch (error) {
              console.error('🗑️ Journal: Delete exception:', error);
              Alert.alert('Error', 'Failed to delete meal');
            }
          }
        }
      ]
    );
  };

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

  const filteredMeals = meals.filter(meal => {
    // Search filter
    if (searchQuery && !meal.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Date filter
    const mealDate = new Date(meal.created_at);
    const now = new Date();
    
    if (selectedFilter === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return mealDate >= todayStart;
    } else if (selectedFilter === 'week') {
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return mealDate >= weekStart;
    }
    
    return true;
  });

  // Calculate totals for summary view
  const totals = filteredMeals.reduce((acc, meal) => ({
    calories: acc.calories + (meal.calories || 0),
    protein: acc.protein + (meal.macros?.protein || 0),
    fat: acc.fat + (meal.macros?.fat || 0),
    carbs: acc.carbs + (meal.macros?.carbs || 0),
    }), { calories: 0, protein: 0, fat: 0, carbs: 0 });

  const renderRightActions = (
    progress: RNAnimated.AnimatedInterpolation<number>, 
    dragX: RNAnimated.AnimatedInterpolation<number>,
    mealId: string
  ) => {
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });

    const opacity = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0, 1],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightActionContainer}>
        <RNAnimated.View style={[styles.deleteAction, { transform: [{ scale }], opacity }]}>
          <TouchableOpacity
            style={styles.deleteActionContent}
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleDeleteMeal(mealId);
            }}
          >
            <IconSymbol name="trash.fill" size={20} color="white" />
            <Text style={styles.deleteActionText}>Delete</Text>
          </TouchableOpacity>
        </RNAnimated.View>
      </View>
    );
  };

  const renderCompactMealRow = ({ item: meal, index }: { item: Meal, index: number }) => (
    <Animated.View 
      entering={FadeInDown.delay(index * 40).springify().damping(20).stiffness(90)}
      layout={LinearTransition.springify().damping(20).stiffness(90)}
    >
      <Swipeable
        renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, meal.id)}
        friction={2}
        rightThreshold={40}
        containerStyle={styles.swipeableContainer}
      >
        <TouchableOpacity
          style={[styles.compactRow, { backgroundColor: colors.background }]} // Match original background perfectly
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
              {meal.description}
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
      </Swipeable>
    </Animated.View>
  );

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
            style={[styles.filterButton, selectedFilter === 'today' && styles.filterButtonActive]}
            onPress={() => setSelectedFilter('today')}
          >
            <Text style={[TextStyles.button, { color: selectedFilter === 'today' ? '#000000' : colors.icon }]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, selectedFilter === 'week' && styles.filterButtonActive]}
            onPress={() => setSelectedFilter('week')}
          >
            <Text style={[TextStyles.button, { color: selectedFilter === 'week' ? '#000000' : colors.icon }]}>
              This Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[TextStyles.button, { color: selectedFilter === 'all' ? '#000000' : colors.icon }]}>
              All
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
            {searchQuery || selectedFilter !== 'all' ? 'No meals found' : 'No meals logged yet'}
          </Text>
          <Text style={[TextStyles.body, { color: colors.icon, textAlign: 'center', lineHeight: 24 }]}>
            {searchQuery || selectedFilter !== 'all' 
              ? 'Try adjusting your search or filter' 
              : 'Start by capturing your first meal'
            }
          </Text>
          {(!searchQuery && selectedFilter === 'all') && (
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
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.compactList}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.compactSeparator} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
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
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: glassBorder,
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
