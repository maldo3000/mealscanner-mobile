import { IconSymbol } from '@/components/ui/IconSymbol';
import { HeroImage } from '@/components/ui/OptimizedImage';
import { Colors } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { deleteRecipe, getRecipeWithDetails } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// Mock recipe data - this will be replaced with Supabase data later
const mockRecipeDetails = {
  '1': {
    id: '1',
    name: 'Mediterranean Quinoa Bowl',
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
    prep_time: '15 min',
    cook_time: '20 min',
    difficulty: 'Easy',
    servings: 4,
    ingredients: [
      { name: 'Quinoa', amount: '1', unit: 'cup' },
      { name: 'Chickpeas', amount: '1', unit: 'can (15 oz)' },
      { name: 'Cucumber', amount: '1', unit: 'medium, diced' },
      { name: 'Cherry tomatoes', amount: '1', unit: 'cup, halved' },
      { name: 'Feta cheese', amount: '1/2', unit: 'cup, crumbled' },
      { name: 'Red onion', amount: '1/4', unit: 'cup, thinly sliced' },
      { name: 'Kalamata olives', amount: '1/3', unit: 'cup, pitted' },
      { name: 'Fresh parsley', amount: '1/4', unit: 'cup, chopped' },
      { name: 'Extra virgin olive oil', amount: '3', unit: 'tbsp' },
      { name: 'Lemon juice', amount: '2', unit: 'tbsp' },
      { name: 'Dried oregano', amount: '1', unit: 'tsp' },
      { name: 'Salt and pepper', amount: 'to', unit: 'taste' },
    ],
    instructions: [
      'Rinse quinoa under cold water until water runs clear. In a medium saucepan, bring 2 cups of water to a boil.',
      'Add quinoa, reduce heat to low, cover and simmer for 15 minutes until water is absorbed.',
      'Remove from heat and let stand for 5 minutes. Fluff with a fork and let cool completely.',
      'Drain and rinse chickpeas. Pat dry with paper towels.',
      'In a large bowl, combine cooled quinoa, chickpeas, diced cucumber, halved tomatoes, and sliced red onion.',
      'Add crumbled feta cheese, olives, and fresh parsley to the bowl.',
      'In a small bowl, whisk together olive oil, lemon juice, oregano, salt, and pepper.',
      'Pour dressing over the quinoa mixture and toss gently to combine.',
      'Let marinate for at least 15 minutes before serving. Can be refrigerated for up to 3 days.',
      'Serve chilled or at room temperature. Garnish with additional feta and parsley if desired.'
    ],
    captured_at: '2024-01-15T12:30:00Z',
    source_meal_id: 'meal_123',
    tags: ['Mediterranean', 'Vegetarian', 'Healthy', 'Make-ahead'],
    nutrition: {
      calories: 320,
      protein: 12,
      carbs: 45,
      fat: 11,
      fiber: 6,
    }
  },
  '2': {
    id: '2',
    name: 'Grilled Salmon with Herbs',
    image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600',
    prep_time: '10 min',
    cook_time: '15 min',
    difficulty: 'Medium',
    servings: 2,
    ingredients: [
      { name: 'Salmon fillets', amount: '2', unit: 'pieces (6 oz each)' },
      { name: 'Fresh dill', amount: '2', unit: 'tbsp, chopped' },
      { name: 'Fresh parsley', amount: '2', unit: 'tbsp, chopped' },
      { name: 'Lemon', amount: '1', unit: 'medium, juiced and zested' },
      { name: 'Extra virgin olive oil', amount: '3', unit: 'tbsp' },
      { name: 'Garlic', amount: '2', unit: 'cloves, minced' },
      { name: 'Salt', amount: '1', unit: 'tsp' },
      { name: 'Black pepper', amount: '1/2', unit: 'tsp' },
      { name: 'Paprika', amount: '1/2', unit: 'tsp' },
    ],
    instructions: [
      'Remove salmon from refrigerator 15 minutes before cooking to bring to room temperature.',
      'Preheat grill to medium-high heat (about 400°F). Clean and oil the grill grates.',
      'Pat salmon fillets dry with paper towels and season both sides with salt and pepper.',
      'In a small bowl, combine chopped dill, parsley, lemon zest, minced garlic, and olive oil.',
      'Reserve half of the herb mixture for serving. Use the other half to brush over salmon fillets.',
      'Sprinkle paprika over the salmon for extra color and flavor.',
      'Place salmon on the grill, skin-side down. Cook for 6-8 minutes without moving.',
      'Carefully flip salmon and cook for another 4-6 minutes until internal temperature reaches 145°F.',
      'Remove from grill and immediately drizzle with lemon juice and remaining herb mixture.',
      'Let rest for 2-3 minutes before serving. Serve with lemon wedges and extra herbs.'
    ],
    captured_at: '2024-01-14T19:15:00Z',
    source_meal_id: 'meal_456',
    tags: ['Seafood', 'Healthy', 'Quick', 'High-protein'],
    nutrition: {
      calories: 285,
      protein: 35,
      carbs: 2,
      fat: 14,
      fiber: 0,
    }
  },
};

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

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients');
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadRecipe();
  }, [id]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      console.log('🍳 Recipe Detail: Loading recipe with ID:', id);
      console.log('🍳 Recipe Detail: ID type:', typeof id, 'ID value:', JSON.stringify(id));
      
      if (!id) {
        console.error('🍳 Recipe Detail: No ID provided');
        setLoading(false);
        return;
      }

      const { data, error } = await getRecipeWithDetails(id as string);
      
      if (error) {
        console.error('🍳 Recipe Detail: Error loading recipe:', error);
        console.error('🍳 Recipe Detail: Error details:', JSON.stringify(error));
      } else {
        console.log('🍳 Recipe Detail: Loaded recipe:', data);
        console.log('🍳 Recipe Detail: Recipe exists:', !!data);
        if (data) {
          console.log('🍳 Recipe Detail: Recipe name:', data.name);
          console.log('🍳 Recipe Detail: Recipe ingredients count:', data.ingredients?.length || 0);
          console.log('🍳 Recipe Detail: Recipe ai_analysis ingredients count:', data.ai_analysis?.ingredients?.length || 0);
        }
        setRecipe(data);
      }
    } catch (error) {
      console.error('🍳 Recipe Detail: Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = async () => {
    Alert.alert(
      'Delete Recipe',
      `Are you sure you want to delete "${recipe?.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              const { error } = await deleteRecipe(id as string);
              
              if (error) {
                console.error('Error deleting recipe:', error);
                Alert.alert('Error', 'Failed to delete recipe. Please try again.');
                return;
              }
              
              // Navigate back to recipes list
              router.replace('/(tabs)/recipes');
              
              // Show success message
              Alert.alert('Success', 'Recipe deleted successfully.');
            } catch (error) {
              console.error('Error deleting recipe:', error);
              Alert.alert('Error', 'Failed to delete recipe. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Helper functions to get ingredients and instructions from either separate tables or ai_analysis
  const getIngredients = () => {
    if (!recipe) return [];
    // First try separate ingredients table
    if (recipe.ingredients && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
      return recipe.ingredients;
    }
    // Fallback to ai_analysis
    if (recipe.ai_analysis?.ingredients) {
      return recipe.ai_analysis.ingredients;
    }
    return [];
  };

  const getInstructions = () => {
    if (!recipe) return [];
    // First try separate instructions table
    if (recipe.instructions && Array.isArray(recipe.instructions) && recipe.instructions.length > 0) {
      return recipe.instructions.map(inst => inst.instruction || inst);
    }
    // Fallback to ai_analysis
    if (recipe.ai_analysis?.instructions) {
      return recipe.ai_analysis.instructions;
    }
    return [];
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <IconSymbol name="hourglass" size={64} color={colors.icon} />
          <Text style={[TextStyles.h3, { color: colors.text, marginTop: 16 }]}>
            Loading Recipe...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <IconSymbol name="exclamationmark.triangle" size={64} color={colors.icon} />
          <Text style={[TextStyles.h3, { color: colors.text, marginTop: 16 }]}>
            Recipe Not Found
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.tint }]}
            onPress={() => router.back()}
          >
            <Text style={[TextStyles.button, { color: 'white' }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <HeroImage source={{ uri: recipe.image_url }} style={styles.heroImage} />
          <TouchableOpacity
            style={[styles.backButtonOverlay, { backgroundColor: colors.background + 'E6' }]}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          
          {/* Delete Button */}
          <TouchableOpacity
            style={[styles.deleteButtonOverlay, { backgroundColor: colors.background + 'E6' }]}
            onPress={handleDeleteRecipe}
            disabled={deleting}
          >
            <IconSymbol name="trash" size={24} color={deleting ? colors.icon : '#EF4444'} />
          </TouchableOpacity>
        </View>

        {/* Recipe Info */}
        <View style={styles.content}>
          <Text style={[TextStyles.h2, { color: colors.text }]}>{recipe.name}</Text>
          
          {/* Meta Info */}
          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <IconSymbol name="clock" size={20} color={colors.icon} />
                <View>
                  <Text style={[TextStyles.caption, { color: colors.icon }]}>Prep</Text>
                  <Text style={[TextStyles.bodyMedium, { color: colors.text }]}>{recipe.prep_time}</Text>
                </View>
              </View>
              
              <View style={styles.metaItem}>
                <IconSymbol name="flame" size={20} color={colors.icon} />
                <View>
                  <Text style={[TextStyles.caption, { color: colors.icon }]}>Cook</Text>
                  <Text style={[TextStyles.bodyMedium, { color: colors.text }]}>{recipe.cook_time}</Text>
                </View>
              </View>
              
              <View style={styles.metaItem}>
                <IconSymbol name="person.2" size={20} color={colors.icon} />
                <View>
                  <Text style={[TextStyles.caption, { color: colors.icon }]}>Servings</Text>
                  <Text style={[TextStyles.bodyMedium, { color: colors.text }]}>{recipe.servings}</Text>
                </View>
              </View>
            </View>
            
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(recipe.difficulty) }]}>
              <Text style={[TextStyles.bodyMedium, { color: 'white', fontWeight: '600' }]}>
                {recipe.difficulty}
              </Text>
            </View>
          </View>

          {/* Nutrition Info */}
          {recipe.nutrition && (
            <View style={[styles.nutritionContainer, { backgroundColor: colors.surface }]}>
              <Text style={[TextStyles.subtitle, { color: colors.text, marginBottom: 12 }]}>Nutrition per serving</Text>
              <View style={styles.nutritionRow}>
                <View style={styles.nutritionItem}>
                  <Text style={[TextStyles.h3, { color: colors.tint }]}>{recipe.nutrition.calories}</Text>
                  <Text style={[TextStyles.caption, { color: colors.icon }]}>Calories</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={[TextStyles.h3, { color: colors.tint }]}>{recipe.nutrition.protein}g</Text>
                  <Text style={[TextStyles.caption, { color: colors.icon }]}>Protein</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={[TextStyles.h3, { color: colors.tint }]}>{recipe.nutrition.carbs}g</Text>
                  <Text style={[TextStyles.caption, { color: colors.icon }]}>Carbs</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={[TextStyles.h3, { color: colors.tint }]}>{recipe.nutrition.fat}g</Text>
                  <Text style={[TextStyles.caption, { color: colors.icon }]}>Fat</Text>
                </View>
              </View>
            </View>
          )}

          {/* Tab Selector */}
          <View style={[styles.tabContainer, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'ingredients' && { backgroundColor: colors.tint }
              ]}
              onPress={() => setActiveTab('ingredients')}
            >
              <Text style={[
                TextStyles.button,
                { color: activeTab === 'ingredients' ? 'white' : colors.text }
              ]}>
                Ingredients ({getIngredients().length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'instructions' && { backgroundColor: colors.tint }
              ]}
              onPress={() => setActiveTab('instructions')}
            >
              <Text style={[
                TextStyles.button,
                { color: activeTab === 'instructions' ? 'white' : colors.text }
              ]}>
                Instructions ({getInstructions().length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'ingredients' ? (
            <View style={styles.ingredientsContainer}>
              {getIngredients().map((ingredient, index) => (
                <View key={index} style={[styles.ingredientItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.ingredientContent}>
                    <Text style={[TextStyles.bodyMedium, { color: colors.text }]}>
                      {ingredient.name}
                    </Text>
                    <Text style={[TextStyles.body, { color: colors.icon }]}>
                      {ingredient.amount} {ingredient.unit}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.instructionsContainer}>
              {getInstructions().map((instruction, index) => (
                <View key={index} style={styles.instructionItem}>
                  <View style={[styles.stepNumber, { backgroundColor: colors.tint }]}>
                    <Text style={[TextStyles.bodyMedium, { color: 'white', fontWeight: '600' }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <Text style={[TextStyles.body, { color: colors.text, flex: 1 }]}>
                    {typeof instruction === 'string' ? instruction : instruction.instruction}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              <Text style={[TextStyles.subtitle, { color: colors.text, marginBottom: 12 }]}>Tags</Text>
              <View style={styles.tagsRow}>
                {recipe.tags.map((tag, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: colors.surface }]}>
                    <Text style={[TextStyles.caption, { color: colors.text }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  heroImage: {
    width: width,
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  backButtonOverlay: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonOverlay: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
  },
  metaContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  nutritionContainer: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  nutritionItem: {
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  ingredientsContainer: {
    marginBottom: 24,
  },
  ingredientItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  ingredientContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instructionsContainer: {
    marginBottom: 24,
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  tagsContainer: {
    marginBottom: 24,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
}); 