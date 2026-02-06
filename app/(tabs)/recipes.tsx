import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { CategoryCard } from '@/components/recipe/CategoryCard';
import { RecipeCardDiscover } from '@/components/recipe/RecipeCardDiscover';
import { RecipeFilters } from '@/components/recipe/RecipeFilters';
import { RecipeFilterSheet } from '@/components/recipe/RecipeFilterSheet';
import type { Recipe } from '@/components/recipe/types';
import { RecipeGeneratorModal } from '@/components/RecipeGeneratorModal';
import { Paywall } from '@/components/subscription/Paywall';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { accentSky, Colors, glassBorder, glassSurface, herbarium, neonGreen } from '@/constants/Colors';
import {
    CALORIE_RANGES,
    DIET_TYPES,
} from '@/constants/recipeCategories';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { FontFamilies, TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useNutritionGoals } from '@/hooks/useNutritionGoals';
import { useRecipes, type PrebakedRecipe } from '@/hooks/useRecipes';
import { getCurrentUser } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

// Feature flag to enable/disable AI recipe generation
const ENABLE_RECIPE_GENERATION = false;

// Featured recipe IDs - hand-picked from the catalog
const FEATURED_RECIPE_IDS = ['r001', 'r002', 'r003', 'r004', 'r005', 'r006'];

export default function RecipesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { activeGoal } = useNutritionGoals();
  
  // Pre-baked recipes from JSON catalog with filtering
  const {
    filteredRecipes: prebakedRecipes,
    recipes: allRecipes,
    tagCategories,
    filters,
    loading: recipesLoading,
    setFilters,
    toggleTag,
    setMaxCalories,
    setSortBy,
    setSearchQuery: setRecipeSearchQuery,
    clearFilters,
    getRecipeById,
  } = useRecipes();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  const { canGenerateRecipes, isPro } = useFeatureAccess();

  const goalName = activeGoal?.name || 'General Health';
  const proteinGoal = activeGoal?.dailyTargets?.proteinGrams;
  
  // Calculate remaining calories for smart filtering
  const remainingCalories = useMemo(() => {
    if (!activeGoal?.dailyTargets?.calories) return null;
    return activeGoal.dailyTargets.calories;
  }, [activeGoal]);

  // Get featured recipes
  const featuredRecipes = useMemo(() => {
    return FEATURED_RECIPE_IDS
      .map(id => getRecipeById(id))
      .filter((recipe): recipe is PrebakedRecipe => recipe !== undefined);
  }, [getRecipeById]);

  // Get remaining recipes (excluding featured ones)
  const remainingRecipes = useMemo(() => {
    return prebakedRecipes.filter(recipe => !FEATURED_RECIPE_IDS.includes(recipe.id));
  }, [prebakedRecipes]);

  // Check if a filter is currently active
  const isFilterActive = (filterValue: string): boolean => {
    return filters.tags.some(tag => tag.toLowerCase() === filterValue.toLowerCase());
  };

  // Check if a calorie range is active
  const isCalorieRangeActive = (max: number): boolean => {
    return filters.maxCalories === max;
  };

  // Fetch user on component mount
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setLoading(true);
      const { user: currentUser } = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowSearchSuggestions(query.length > 0);
    setRecipeSearchQuery(query);
  };

  const handleSuggestionPress = async (type: 'search' | 'generate') => {
    setShowSearchSuggestions(false);
    if (type === 'generate') {
      await handleOpenGenerator();
    }
  };

  const handleOpenGenerator = async () => {
    const access = canGenerateRecipes();
    if (!access.allowed) {
      setPaywallVisible(true);
      return;
    }
    setShowGeneratorModal(true);
  };

  const handleRecipePress = (recipe: Recipe | PrebakedRecipe) => {
    const isPrebaked = 'tier' in recipe;
    if (isPrebaked && (recipe as PrebakedRecipe).tier === 'pro' && !isPro) {
      setPaywallVisible(true);
      return;
    }
    router.push(`/recipe/${recipe.id}`);
  };

  const handleCategoryPress = (filter: string) => {
    toggleTag(filter);
  };

  const handleCalorieRangePress = (max: number) => {
    if (filters.maxCalories === max) {
      setMaxCalories(null);
    } else {
      setMaxCalories(max);
    }
  };
  
  // Convert PrebakedRecipe to Recipe format for card display
  const prebakedToRecipe = (prebaked: PrebakedRecipe): Recipe => ({
    id: prebaked.id,
    user_id: 'system',
    name: prebaked.name,
    description: prebaked.description,
    image_url: prebaked.image_url,
    total_time: prebaked.total_time,
    source_type: 'discover',
    is_favorite: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    nutrition_per_serving: prebaked.nutrition_per_serving,
    tags: prebaked.tags.map(tag => 
      tag.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    ),
  });

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  const SearchSuggestions = () => {
    if (!showSearchSuggestions || !searchQuery) return null;

    return (
      <Animated.View 
        entering={FadeIn.duration(200)} 
        exiting={FadeOut.duration(200)}
        style={[styles.suggestionsOverlay, { backgroundColor: colors.background }]}
      >
        <TouchableOpacity 
          style={styles.suggestionItem}
          onPress={() => handleSuggestionPress('search')}
        >
          <IconSymbol name="magnifyingglass" size={20} color={colors.icon} />
          <Text style={[TextStyles.body, { color: colors.text }]}>
            Search recipes for <Text style={{ fontWeight: 'bold' }}>"{searchQuery}"</Text>
          </Text>
        </TouchableOpacity>
        
        {ENABLE_RECIPE_GENERATION && (
          <TouchableOpacity 
            style={[styles.suggestionItem, { borderTopWidth: 1, borderTopColor: glassBorder }]}
            onPress={() => handleSuggestionPress('generate')}
          >
            <IconSymbol name="sparkles" size={20} color={accentSky} />
            <Text style={[TextStyles.body, { color: colors.text }]}>
              Generate a new <Text style={{ fontWeight: 'bold' }}>{searchQuery}</Text> recipe for my goal ({goalName})
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  // Check if any filters are active
  const hasActiveFilters = filters.tags.length > 0 || filters.maxCalories !== null || filters.searchQuery.trim() !== '';

  const renderContent = () => (
    <View style={styles.content}>
      {/* Show filter summary only when filters are active */}
      {hasActiveFilters && (
        <RecipeFilters
          filters={filters}
          onOpenFilterSheet={() => setFilterSheetVisible(true)}
          onRemoveTag={toggleTag}
          onRemoveMaxCalories={() => setMaxCalories(null)}
          onRemoveSort={() => setSortBy('default')}
          onClearFilters={clearFilters}
        />
      )}

      {/* Detailed Filter Sheet */}
      <RecipeFilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        filters={filters}
        onApply={setFilters}
        tagCategories={tagCategories}
        remainingCalories={remainingCalories}
      />

      {/* Pick Your Diet - 3-column Grid */}
      <Animated.View entering={FadeInDown.duration(600).delay(100).easing(Easing.out(Easing.quad))}>
        <SectionHeader title="Pick Your Diet" />
        <View style={styles.categoryGrid}>
          {DIET_TYPES.map((diet) => (
            <View key={diet.filter} style={styles.categoryGridItem}>
              <CategoryCard
                icon={diet.icon}
                label={diet.label}
                onPress={() => handleCategoryPress(diet.filter)}
                isSelected={isFilterActive(diet.filter)}
              />
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Recipes by Calorie Range - 3-column Grid */}
      <Animated.View entering={FadeInDown.duration(600).delay(200).easing(Easing.out(Easing.quad))}>
        <SectionHeader title="Recipes by Calorie Range" />
        <View style={styles.categoryGrid}>
          {CALORIE_RANGES.map((range) => (
            <View key={range.label} style={styles.categoryGridItem}>
              <CategoryCard
                icon={range.icon}
                label={range.label}
                onPress={() => handleCalorieRangePress(range.max)}
                isSelected={isCalorieRangeActive(range.max)}
              />
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Featured Recipes - Horizontal Scroll */}
      {!hasActiveFilters && featuredRecipes.length > 0 && (
        <Animated.View entering={FadeInDown.duration(600).delay(300).easing(Easing.out(Easing.quad))}>
          <SectionHeader title="Featured" />
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScroll}
          >
            {featuredRecipes.map((item) => (
              <RecipeCardDiscover 
                key={item.id}
                recipe={prebakedToRecipe(item)} 
                onPress={() => handleRecipePress(item)}
                isLocked={item.tier === 'pro' && !isPro}
                size="large"
              />
            ))}
          </ScrollView>
        </Animated.View>
      )}

      {/* All Recipes Grid */}
      <Animated.View entering={FadeInDown.duration(600).delay(hasActiveFilters ? 300 : 400).easing(Easing.out(Easing.quad))}>
        <SectionHeader title={hasActiveFilters ? "Matching Recipes" : "All Recipes"} />
        <Text style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: Spacing.md, marginTop: -Spacing.xs }]}>
          {hasActiveFilters ? prebakedRecipes.length : remainingRecipes.length} recipes
        </Text>
        
        {(hasActiveFilters ? prebakedRecipes : remainingRecipes).length === 0 ? (
          <View style={styles.emptyPillar}>
            <IconSymbol name="magnifyingglass" size={32} color={colors.icon} />
            <Text style={[TextStyles.body, { color: colors.icon, textAlign: 'center', marginTop: Spacing.sm }]}>
              No recipes match your filters
            </Text>
            <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
              <Text style={[TextStyles.bodySmall, { color: neonGreen, fontWeight: '600' }]}>
                Clear all filters
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={hasActiveFilters ? prebakedRecipes : remainingRecipes}
            renderItem={({ item }) => (
              <RecipeCardDiscover 
                recipe={prebakedToRecipe(item)} 
                onPress={() => handleRecipePress(item)}
                isLocked={item.tier === 'pro' && !isPro}
              />
            )}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.recipeGrid}
          />
        )}
      </Animated.View>
    </View>
  );

  return (
    <PageContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <PageHeader title="Recipes" />

        {/* Generate Recipe Button - Hidden when ENABLE_RECIPE_GENERATION is false */}
        {ENABLE_RECIPE_GENERATION && !loading && user && (
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: neonGreen }]}
            onPress={handleOpenGenerator}
            activeOpacity={0.8}
          >
            <View style={styles.generateIconContainer}>
              <IconSymbol name="sparkles" size={20} color="#000000" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[TextStyles.button, { color: '#000000' }]}>
                Generate Recipe
              </Text>
              <Text style={[TextStyles.caption, { color: 'rgba(0,0,0,0.6)', fontWeight: '600' }]}>
                {proteinGoal ? `Based on your ${proteinGoal}g protein goal` : 'Custom AI creation'}
              </Text>
            </View>
            {!isPro && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Search and Filter Controls */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchRow}>
            <View style={[styles.searchContainer, { backgroundColor: glassSurface, borderColor: glassBorder, borderWidth: 1 }]}>
              <IconSymbol name="magnifyingglass" size={20} color={colors.icon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search salmon, keto, high protein..."
                placeholderTextColor={colors.icon}
                value={searchQuery}
                onChangeText={handleSearch}
                onFocus={() => searchQuery && setShowSearchSuggestions(true)}
              />
            </View>
            <TouchableOpacity 
              style={styles.filterButton}
              onPress={() => setFilterSheetVisible(true)}
            >
              <IconSymbol name="slider.horizontal.3" size={20} color={herbarium.textPrimary} />
            </TouchableOpacity>
          </View>
          <SearchSuggestions />
        </View>
        
        {/* UpgradePrompt for AI Recipes - Hidden when ENABLE_RECIPE_GENERATION is false */}
        {ENABLE_RECIPE_GENERATION && !isPro && (
          <UpgradePrompt 
            feature="recipes"
            title="Unlock AI Recipes"
            message="Upgrade to Pro to generate custom recipes from your meals, search our full library, and save your favorites."
            style={{ marginHorizontal: PageSpacing.containerPadding, marginBottom: Spacing.lg }}
          />
        )}

        {/* Content */}
        {(loading || recipesLoading) ? (
          <View style={styles.loadingContainer}>
            <Text style={[TextStyles.body, { color: colors.icon }]}>Loading recipes...</Text>
          </View>
        ) : (
          renderContent()
        )}
      </ScrollView>

      {/* Recipe Generator Modal */}
      {user && (
        <RecipeGeneratorModal
          visible={showGeneratorModal}
          userId={user.id}
          onClose={() => setShowGeneratorModal(false)}
          onRecipeGenerated={() => {
            loadUser();
          }}
        />
      )}

      {/* Paywall Modal */}
      <Paywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        feature="recipes"
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: PageSpacing.containerPadding + 40,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 20,
    marginBottom: Spacing.lg,
    gap: 12,
    shadowColor: neonGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: {
    position: 'relative',
    zIndex: 10,
    marginBottom: Spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: herbarium.surface1,
    borderWidth: 1,
    borderColor: herbarium.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  suggestionsOverlay: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: glassBorder,
    overflow: 'hidden',
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: FontFamilies.headingBold,
    fontSize: 18,
    color: herbarium.textPrimary,
    letterSpacing: -0.2,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryGridItem: {
    width: '33.33%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  featuredScroll: {
    paddingRight: Spacing.md,
  },
  recipeGrid: {
    paddingBottom: Spacing.md,
  },
  emptyPillar: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: glassSurface,
    borderRadius: 20,
    marginTop: Spacing.md,
  },
  clearFiltersButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  proBadge: {
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proBadgeText: {
    ...TextStyles.caption,
    color: neonGreen,
    fontWeight: '700',
    fontSize: 10,
  },
});
