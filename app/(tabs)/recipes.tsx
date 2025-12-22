import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { RecipeGeneratorModal } from '@/components/RecipeGeneratorModal';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThumbnailImage } from '@/components/ui/OptimizedImage';
import { Colors, glassBorder, glassSurface, neonGreen } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getCurrentUser, getUserRecipes, searchRecipes } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

type Recipe = {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  image_url?: string;
  prep_time?: string;
  cook_time?: string;
  total_time?: string;
  servings?: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  cuisine_type?: string;
  source_meal_id?: string;
  source_type: 'image' | 'text';
  ai_analysis?: any;
  nutrition_per_serving?: any;
  tags?: string[];
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
};

interface RecipeCardProps {
  recipe: Recipe;
  onPress: () => void;
  viewMode: 'grid' | 'list';
}

function RecipeCard({ recipe, onPress, viewMode }: RecipeCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity 
      style={[
        viewMode === 'list' ? styles.recipeCardList : styles.recipeCardGrid,
        Platform.OS === 'web' && viewMode === 'grid' && styles.recipeCardGridWeb,
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Card variant="glass" style={styles.card} padding="none">
        {viewMode === 'grid' ? (
          <>
            {/* Square thumbnail for grid */}
            {recipe.image_url ? (
              <ThumbnailImage 
                source={{ uri: recipe.image_url }} 
                style={styles.recipeImageGrid}
              />
            ) : (
              <View style={[styles.recipeImageGrid, styles.placeholderImage, { backgroundColor: colors.border }]}>
                <IconSymbol name="fork.knife" size={32} color={colors.icon} />
              </View>
            )}
            <View style={styles.recipeContentGrid}>
              <Text style={[TextStyles.bodySmall, { color: colors.text }]} numberOfLines={2}>
                {recipe.name}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.listLayout}>
            {/* Horizontal layout for list */}
            {recipe.image_url ? (
              <ThumbnailImage 
                source={{ uri: recipe.image_url }} 
                style={styles.recipeImageList}
              />
            ) : (
              <View style={[styles.recipeImageList, styles.placeholderImage, { backgroundColor: colors.border }]}>
                <IconSymbol name="fork.knife" size={24} color={colors.icon} />
              </View>
            )}
            <View style={styles.recipeContentList}>
              <Text style={[TextStyles.bodySmall, { color: colors.text }]} numberOfLines={2}>
                {recipe.name}
              </Text>
            </View>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}


export default function RecipesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);

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
      // If search is cleared, reload all recipes
      loadUserAndRecipes();
    }
  };

  const handleRecipePress = (recipe: Recipe) => {
    // Navigate to recipe detail screen
    console.log('🍳 Recipes: Navigating to recipe detail with ID:', recipe.id);
    console.log('🍳 Recipes: Recipe object:', JSON.stringify(recipe, null, 2));
    router.push(`/recipe/${recipe.id}`);
  };


  const renderRecipe = ({ item }: { item: Recipe }) => (
    <RecipeCard 
      recipe={item} 
      onPress={() => handleRecipePress(item)}
      viewMode={viewMode}
    />
  );

  return (
    <PageContainer>
      <PageHeader
        title="Recipes"
        subtitle={`${filteredRecipes.length} saved ${filteredRecipes.length === 1 ? 'recipe' : 'recipes'}`}
      />

      {/* Generate Recipe Button */}
      {!loading && user && (
        <TouchableOpacity
          style={[styles.generateButton, { backgroundColor: neonGreen }]}
          onPress={() => setShowGeneratorModal(true)}
          activeOpacity={0.8}
        >
          <IconSymbol name="sparkles" size={20} color="#000000" />
          <Text style={[TextStyles.button, { color: '#000000', marginLeft: 8 }]}>
            Generate Recipe
          </Text>
        </TouchableOpacity>
      )}

      {/* Search and Controls */}
      <View style={styles.controls}>
        <View style={[styles.searchContainer, { backgroundColor: glassSurface, borderColor: glassBorder, borderWidth: 1 }]}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.icon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search recipes or ingredients..."
            placeholderTextColor={colors.icon}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
        
        <View style={styles.viewControls}>
          <TouchableOpacity
            style={[
              styles.viewButton,
              { 
                backgroundColor: viewMode === 'grid' ? neonGreen : glassSurface,
                borderColor: glassBorder,
                borderWidth: 1
              }
            ]}
            onPress={() => setViewMode('grid')}
          >
            <IconSymbol 
              name="grid" 
              size={20} 
              color={viewMode === 'grid' ? '#000000' : colors.icon} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewButton,
              { 
                backgroundColor: viewMode === 'list' ? neonGreen : glassSurface,
                borderColor: glassBorder,
                borderWidth: 1
              }
            ]}
            onPress={() => setViewMode('list')}
          >
            <IconSymbol 
              name="list.bullet" 
              size={20} 
              color={viewMode === 'list' ? '#000000' : colors.icon} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Recipes List */}
      {loading ? (
        <FlatList
          data={[1, 2, 3, 4, 5, 6]}
          renderItem={() => (
            <View style={viewMode === 'grid' ? styles.recipeCardGrid : styles.recipeCardList}>
              <Card variant="glass" style={styles.card} padding="none">
                {viewMode === 'grid' ? (
                  <>
                    <View style={[styles.recipeImageGrid, { backgroundColor: colors.border, opacity: 0.3 }]} />
                    <View style={styles.recipeContentGrid}>
                      <View style={[styles.skeletonText, { width: '90%', height: 16, backgroundColor: colors.border, opacity: 0.3, borderRadius: 4 }]} />
                    </View>
                  </>
                ) : (
                  <View style={styles.listLayout}>
                    <View style={[styles.recipeImageList, { backgroundColor: colors.border, opacity: 0.3 }]} />
                    <View style={styles.recipeContentList}>
                      <View style={[styles.skeletonText, { width: '80%', height: 16, backgroundColor: colors.border, opacity: 0.3, borderRadius: 4 }]} />
                    </View>
                  </View>
                )}
              </Card>
            </View>
          )}
          keyExtractor={(item) => item.toString()}
          numColumns={viewMode === 'grid' ? (Platform.OS === 'web' ? 4 : 2) : 1}
          key={viewMode}
          contentContainerStyle={styles.recipesList}
          showsVerticalScrollIndicator={false}
        />
      ) : (console.log('🍳 Recipes: Render check - recipes.length:', recipes.length, 'filteredRecipes.length:', filteredRecipes.length, 'searchQuery:', searchQuery), filteredRecipes.length === 0) ? (
        <View style={styles.emptyState}>
          <IconSymbol name="fork.knife" size={64} color={colors.icon} />
          <Text style={[TextStyles.h3, { color: colors.text, marginTop: 16 }]}>
            No Recipes Yet
          </Text>
          <Text style={[TextStyles.body, { color: colors.icon, textAlign: 'center', marginTop: 8, lineHeight: 22 }]}>
            {searchQuery ? 'No recipes match your search.' : 'Capture your first recipe from the Log tab to get started!'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: neonGreen }]}
              onPress={() => router.push('/(tabs)/log')}
            >
              <IconSymbol name="camera" size={20} color="#000000" />
              <Text style={[TextStyles.button, { color: '#000000', marginLeft: 8 }]}>
                Capture Recipe
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredRecipes}
          renderItem={renderRecipe}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? (Platform.OS === 'web' ? 4 : 2) : 1}
          key={viewMode} // Force re-render when view mode changes
          contentContainerStyle={styles.recipesList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
            />
          }
        />
      )}

      {/* Recipe Generator Modal */}
      {user && (
        <RecipeGeneratorModal
          visible={showGeneratorModal}
          userId={user.id}
          onClose={() => setShowGeneratorModal(false)}
          onRecipeGenerated={() => {
            loadUserAndRecipes();
          }}
        />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: Spacing.md,
    shadowColor: neonGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  controls: {
    flexDirection: 'row',
    paddingBottom: Spacing.base,
    gap: Spacing.md,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  viewControls: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  recipesList: {
    paddingBottom: PageSpacing.containerPadding,
  },
  recipeCardGrid: {
    flex: 1,
    marginHorizontal: Spacing.sm,
    marginBottom: PageSpacing.cardGap,
  },
  recipeCardGridWeb: {
    marginHorizontal: Spacing.xs,
    marginBottom: PageSpacing.cardGap,
  },
  recipeCardList: {
    marginBottom: PageSpacing.cardGap,
  },
  card: {
    overflow: 'hidden',
  },
  listLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeImageGrid: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  recipeImageList: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    margin: Spacing.base,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeContentGrid: {
    padding: Spacing.base,
    paddingTop: Spacing.md,
  },
  recipeContentList: {
    flex: 1,
    paddingRight: Spacing.base,
    justifyContent: 'center',
  },
  skeletonText: {
    borderRadius: 4,
  },
});

