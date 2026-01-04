import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { RecipeGeneratorModal } from '@/components/RecipeGeneratorModal';
import { SourceBadge } from '@/components/recipe/SourceBadge';
import { RecipeCardDiscover } from '@/components/recipe/RecipeCardDiscover';
import { RecipeCardAI } from '@/components/recipe/RecipeCardAI';
import type { Recipe } from '@/components/recipe/types';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThumbnailImage } from '@/components/ui/OptimizedImage';
import { Tag } from '@/components/ui/Tag';
import { Colors, glassBorder, glassSurface, neonGreen, accentSky } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useNutritionGoals } from '@/hooks/useNutritionGoals';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { Paywall } from '@/components/subscription/Paywall';
import { getCurrentUser, getUserRecipes, searchRecipes } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, useMemo } from 'react';
import Animated, { FadeInDown, LinearTransition, Easing, FadeIn, FadeOut } from 'react-native-reanimated';
import {
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ScrollView
} from 'react-native';

const MOCK_DISCOVER_RECIPES: Recipe[] = [
  {
    id: 'd1',
    user_id: 'system',
    name: 'High Protein Salmon Bowl',
    image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
    total_time: '20 mins',
    source_type: 'discover',
    is_favorite: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    nutrition_per_serving: { calories: 450, protein: 35 },
    tags: ['High Protein', 'Under 30 Mins'],
  },
  {
    id: 'd2',
    user_id: 'system',
    name: 'Keto Avocado Salad',
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    total_time: '15 mins',
    source_type: 'discover',
    is_favorite: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    nutrition_per_serving: { calories: 320, protein: 8 },
    tags: ['Keto', 'Quick'],
  },
  {
    id: 'd3',
    user_id: 'system',
    name: 'Quinoa Veggie Power Bowl',
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    total_time: '25 mins',
    source_type: 'discover',
    is_favorite: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    nutrition_per_serving: { calories: 380, protein: 12 },
    tags: ['Vegetarian', 'Fiber Rich'],
  },
  {
    id: 'd4',
    user_id: 'system',
    name: 'Lemon Herb Grilled Chicken',
    image_url: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800',
    total_time: '30 mins',
    source_type: 'discover',
    is_favorite: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    nutrition_per_serving: { calories: 290, protein: 42 },
    tags: ['Low Carb', 'High Protein'],
  }
];

export default function RecipesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { activeGoal } = useNutritionGoals();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'discover' | 'kitchen'>('discover');
  const [paywallVisible, setPaywallVisible] = useState(false);

  const { canGenerateRecipes, isPro, showPaywall } = useFeatureAccess();

  // Unified kitchen recipes (all user-added recipes)
  const kitchenRecipes = recipes;

  const goalName = activeGoal?.name || 'General Health';
  const proteinGoal = activeGoal?.dailyTargets?.proteinGrams;

  // Fetch user and recipes on component mount
  useEffect(() => {
    loadUserAndRecipes();
  }, []);

  // Filter recipes based on search query
  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (recipe.cuisine_type && recipe.cuisine_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (recipe.tags && recipe.tags.some(tag => 
      tag.toLowerCase().includes(searchQuery.toLowerCase())
    ))
  );

  const loadUserAndRecipes = async () => {
    try {
      setLoading(true);
      console.log('🍳 Recipes: Starting to load user and recipes...');
      
      // Get current user
      const { user: currentUser } = await getCurrentUser();
      console.log('🍳 Recipes: Current user:', currentUser?.id);
      setUser(currentUser);
      
      if (currentUser) {
        // Fetch user's recipes
        console.log('🍳 Recipes: Fetching recipes for user:', currentUser.id);
        const { data: recipesData, error } = await getUserRecipes(currentUser.id);
        
        if (error) {
          console.error('🍳 Recipes: Error fetching recipes:', error);
        } else {
          console.log('🍳 Recipes: Received recipes data:', recipesData);
          console.log('🍳 Recipes: Number of recipes:', recipesData?.length || 0);
          setRecipes(recipesData || []);
        }
      } else {
        console.log('🍳 Recipes: No current user found');
      }
    } catch (error) {
      console.error('🍳 Recipes: Error loading user and recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserAndRecipes();
    setRefreshing(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setShowSearchSuggestions(query.length > 0);
    
    if (query.trim() && user) {
      try {
        const { data: searchResults } = await searchRecipes(user.id, query.trim());
        if (searchResults) {
          setRecipes(searchResults);
        }
      } catch (error) {
        console.error('Search error:', error);
      }
    } else if (!query.trim()) {
      loadUserAndRecipes();
      setShowSearchSuggestions(false);
    }
  };

  const handleSuggestionPress = async (type: 'search' | 'generate') => {
    setShowSearchSuggestions(false);
    if (type === 'generate') {
      await handleOpenGenerator();
    }
    // For 'search', it already filtered the list
  };

  const handleOpenGenerator = async () => {
    // Check if user has Pro access for recipe generation
    const access = canGenerateRecipes();
    if (!access.allowed) {
      // Show paywall when trying to generate without Pro
      const success = await showPaywall();
      if (!success) {
        setPaywallVisible(true);
      }
      return;
    }
    setShowGeneratorModal(true);
  };

  const handleRecipePress = (recipe: Recipe) => {
    // Navigate to recipe detail screen
    console.log('🍳 Recipes: Navigating to recipe detail with ID:', recipe.id);
    console.log('🍳 Recipes: Recipe object:', JSON.stringify(recipe, null, 2));
    router.push(`/recipe/${recipe.id}`);
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
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
            Search my recipes for <Text style={{ fontWeight: 'bold' }}>"{searchQuery}"</Text>
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.suggestionItem, { borderTopWidth: 1, borderTopColor: glassBorder }]}
          onPress={() => handleSuggestionPress('generate')}
        >
          <IconSymbol name="sparkles" size={20} color={accentSky} />
          <Text style={[TextStyles.body, { color: colors.text }]}>
            ✨ Generate a new <Text style={{ fontWeight: 'bold' }}>{searchQuery}</Text> recipe for my goal ({goalName})
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderDiscoverTab = () => (
    <View style={styles.tabContent}>
      <SectionHeader title="Suggested for You" />
      <Text style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: Spacing.md, marginTop: -Spacing.xs }]}>
        Browse our preselected and curated recipes
      </Text>
      <FlatList
        data={MOCK_DISCOVER_RECIPES}
        renderItem={({ item }) => (
          <RecipeCardDiscover 
        recipe={item} 
        onPress={() => handleRecipePress(item)}
          />
        )}
        keyExtractor={(item) => item.id}
        numColumns={2}
        scrollEnabled={false}
        contentContainerStyle={styles.discoverGrid}
      />
    </View>
  );

  const renderKitchenTab = () => (
    <View style={styles.tabContent}>
      <SectionHeader title="Your Creations" />
      {kitchenRecipes.length > 0 ? (
        kitchenRecipes.map((recipe) => (
          <RecipeCardAI 
            key={recipe.id} 
            recipe={recipe} 
            onPress={() => handleRecipePress(recipe)} 
          />
        ))
      ) : (
        <View style={styles.emptyPillar}>
          <Text style={[TextStyles.body, { color: colors.icon, textAlign: 'center' }]}>
            Your kitchen is empty. Tap 'Generate' or scan a meal to start your collection!
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <PageContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <PageHeader
        title="Recipes"
          subtitle="Your digital wellness cookbook"
      />

      {/* Generate Recipe Button */}
      {!loading && user && (
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

      {/* Search and Controls */}
        <View style={styles.searchWrapper}>
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
          <SearchSuggestions />
        </View>
        
        {/* Pillar Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            onPress={() => setActiveTab('discover')}
            style={[styles.tab, activeTab === 'discover' && { borderBottomColor: neonGreen, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabText, { color: activeTab === 'discover' ? colors.text : colors.icon }]}>Discover</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('kitchen')}
            style={[styles.tab, activeTab === 'kitchen' && { borderBottomColor: accentSky, borderBottomWidth: 2 }]}
          >
            <Text style={[styles.tabText, { color: activeTab === 'kitchen' ? colors.text : colors.icon }]}>AI Kitchen</Text>
          </TouchableOpacity>
      </View>

        {/* Active Tab Content */}
      {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[TextStyles.body, { color: colors.icon }]}>Loading recipes...</Text>
        </View>
      ) : (
          <Animated.View key={activeTab} entering={FadeIn.duration(300)}>
            {activeTab === 'discover' && renderDiscoverTab()}
            {activeTab === 'kitchen' && renderKitchenTab()}
          </Animated.View>
        )}
      </ScrollView>

      {/* Recipe Generator Modal */}
      {user && (
        <RecipeGeneratorModal
          visible={showGeneratorModal}
          userId={user.id}
          onClose={() => setShowGeneratorModal(false)}
          onRecipeGenerated={() => {
            loadUserAndRecipes();
            setActiveTab('kitchen');
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
    marginBottom: Spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    ...Platform.select({
      web: { outlineStyle: 'none' }
    }),
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
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: glassBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    ...TextStyles.body,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  sectionHeader: {
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    ...TextStyles.caption,
    color: 'rgba(255, 255, 255, 0.4)', // Muted Sage approximation
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  discoverGrid: {
    paddingBottom: Spacing.lg,
  },
  scannedItem: {
    marginBottom: Spacing.sm,
  },
  scannedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  scannedImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  scannedPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannedInfo: {
    flex: 1,
  },
  emptyPillar: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: glassSurface,
    borderRadius: 20,
    marginTop: Spacing.md,
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

