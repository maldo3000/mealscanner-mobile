import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThumbnailImage } from '@/components/ui/OptimizedImage';
import { Colors } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { deleteRecipe, getCurrentUser, getUserRecipes, searchRecipes } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  onDelete: (recipeId: string) => void;
  viewMode: 'grid' | 'list';
}

function RecipeCard({ recipe, onPress, onDelete, viewMode }: RecipeCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Animation for delete button
  const deleteOpacity = useSharedValue(1);
  
  const deleteAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: deleteOpacity.value,
    };
  });
  
  const handleDeletePressIn = () => {
    deleteOpacity.value = withTiming(0.5, { duration: 150 });
  };
  
  const handleDeletePressOut = () => {
    deleteOpacity.value = withTiming(1, { duration: 150 });
  };

  const handleLongPress = () => {
    Alert.alert(
      'Recipe Options',
      `What would you like to do with "${recipe.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDelete(),
        },
      ]
    );
  };

  const handleDelete = () => {
    console.log('🗑️ RecipeCard: Delete button pressed for recipe:', recipe.name, 'ID:', recipe.id);
    Alert.alert(
      'Delete Recipe',
      `Are you sure you want to delete "${recipe.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log('🗑️ RecipeCard: User confirmed delete for recipe ID:', recipe.id);
            onDelete(recipe.id);
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity 
      style={[
        viewMode === 'list' ? styles.recipeCardList : styles.recipeCardGrid,
        Platform.OS === 'web' && viewMode === 'grid' && styles.recipeCardGridWeb,
        { backgroundColor: colors.surface }
      ]} 
      onPress={onPress}
      onLongPress={handleLongPress}
      delayLongPress={500}
    >
      {/* Square thumbnail */}
      {recipe.image_url ? (
        <ThumbnailImage 
          source={{ uri: recipe.image_url }} 
          style={viewMode === 'list' ? styles.recipeImageList : styles.recipeImageGrid}
        />
      ) : (
        <View style={[
          viewMode === 'list' ? styles.recipeImageList : styles.recipeImageGrid, 
          styles.placeholderImage, 
          { backgroundColor: colors.border }
        ]}>
          <IconSymbol name="fork.knife" size={viewMode === 'list' ? 24 : 32} color={colors.icon} />
        </View>
      )}
      
      <View style={[
        styles.recipeContent, 
        viewMode === 'grid' && styles.recipeContentGrid,
        Platform.OS === 'web' && viewMode === 'grid' && styles.recipeContentGridWeb
      ]}>
        <Text style={[TextStyles.h4, { color: colors.text }]} numberOfLines={2}>
          {recipe.name}
        </Text>
        {recipe.description && viewMode === 'list' && (
          <Text style={[TextStyles.body, { color: colors.icon, marginTop: 4 }]} numberOfLines={2}>
            {recipe.description}
          </Text>
        )}
        <View style={[
          styles.recipeMetaRow, 
          viewMode === 'grid' && styles.recipeMetaRowGrid,
          Platform.OS === 'web' && viewMode === 'grid' && styles.recipeMetaRowGridWeb
        ]}>
          <View style={[
            styles.recipeMetaLeft,
            Platform.OS === 'web' && viewMode === 'grid' && styles.recipeMetaLeftWeb
          ]}>
            {recipe.prep_time && (
              <View style={styles.recipeMeta}>
                <IconSymbol name="clock" size={14} color={colors.icon} />
                <Text style={[TextStyles.caption, { color: colors.icon }]}>
                  {recipe.prep_time}
                </Text>
              </View>
            )}
            {recipe.servings && (
              <View style={styles.recipeMeta}>
                <IconSymbol name="person.2" size={14} color={colors.icon} />
                <Text style={[TextStyles.caption, { color: colors.icon }]}>
                  {recipe.servings} servings
                </Text>
              </View>
            )}
          </View>
          {recipe.difficulty && (
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(recipe.difficulty) }]}>
              <Text style={[TextStyles.caption, { color: 'white', fontWeight: '600' }]}>
                {recipe.difficulty}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Delete button overlay */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(e) => {
          e.stopPropagation();
          handleDelete();
        }}
        onPressIn={handleDeletePressIn}
        onPressOut={handleDeletePressOut}
        activeOpacity={1}
      >
        <Animated.View style={deleteAnimatedStyle}>
          <IconSymbol name="trash" size={18} color="#EF4444" />
        </Animated.View>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'easy':
      return '#10B981';
    case 'medium':
      return '#F59E0B';
    case 'hard':
      return '#EF4444';
    default:
      return '#6B7280';
  }
}

export default function RecipesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

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

  const handleDeleteRecipe = async (recipeId: string) => {
    try {
      console.log('🗑️ Recipes: handleDeleteRecipe called with ID:', recipeId);
      const { error } = await deleteRecipe(recipeId);
      
      if (error) {
        console.error('🗑️ Recipes: Delete error:', error);
        Alert.alert('Error', 'Failed to delete recipe. Please try again.');
        return;
      }
      
      console.log('🗑️ Recipes: Delete successful, updating UI...');
      // Remove the recipe from the local state
      setRecipes(prevRecipes => prevRecipes.filter(recipe => recipe.id !== recipeId));
      
      console.log('✅ Recipes: Recipe deleted successfully, UI updated');
    } catch (error) {
      console.error('🗑️ Recipes: Delete exception:', error);
      Alert.alert('Error', 'Failed to delete recipe. Please try again.');
    }
  };

  const renderRecipe = ({ item }: { item: Recipe }) => (
    <RecipeCard 
      recipe={item} 
      onPress={() => handleRecipePress(item)}
      onDelete={handleDeleteRecipe}
      viewMode={viewMode}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={[TextStyles.h2, { color: colors.text }]}>Recipes</Text>
        <Text style={[TextStyles.body, { color: colors.icon, marginTop: 4, lineHeight: 22 }]}>
          {filteredRecipes.length} saved {filteredRecipes.length === 1 ? 'recipe' : 'recipes'}
        </Text>
      </View>

      {/* Search and Controls */}
      <View style={styles.controls}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
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
              { backgroundColor: viewMode === 'grid' ? colors.tint : colors.surface }
            ]}
            onPress={() => setViewMode('grid')}
          >
            <IconSymbol 
              name="grid" 
              size={20} 
              color={viewMode === 'grid' ? 'white' : colors.icon} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewButton,
              { backgroundColor: viewMode === 'list' ? colors.tint : colors.surface }
            ]}
            onPress={() => setViewMode('list')}
          >
            <IconSymbol 
              name="list.bullet" 
              size={20} 
              color={viewMode === 'list' ? 'white' : colors.icon} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Recipes List */}
      {loading ? (
        <View style={styles.emptyState}>
          <IconSymbol name="hourglass" size={64} color={colors.icon} />
          <Text style={[TextStyles.h3, { color: colors.text, marginTop: 16 }]}>
            Loading Recipes...
          </Text>
          <Text style={[TextStyles.body, { color: colors.icon, textAlign: 'center', marginTop: 8, lineHeight: 22 }]}>
            Please wait while we fetch your recipes
          </Text>
        </View>
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
              style={[styles.ctaButton, { backgroundColor: colors.tint }]}
              onPress={() => router.push('/(tabs)/log')}
            >
              <IconSymbol name="camera" size={20} color="white" />
              <Text style={[TextStyles.button, { color: 'white', marginLeft: 8 }]}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  controls: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 12,
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
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  recipeCardGrid: {
    flex: 1,
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  recipeCardGridWeb: {
    margin: 3,
    borderRadius: 10,
    shadowRadius: 4,
  },
  recipeCardList: {
    flexDirection: 'row',
    marginHorizontal: 6,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  recipeImageGrid: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f0f0f0',
  },
  recipeImageList: {
    width: 100,
    height: 100,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    margin: 12,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeContent: {
    flex: 1,
    padding: 16,
  },
  recipeContentGrid: {
    padding: 10,
  },
  recipeContentGridWeb: {
    padding: 8,
  },
  recipeMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  recipeMetaRowGrid: {
    marginTop: 4,
    marginBottom: 4,
  },
  recipeMetaRowGridWeb: {
    marginTop: 2,
    marginBottom: 2,
  },
  recipeMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recipeMetaLeftWeb: {
    gap: 8,
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
}); 