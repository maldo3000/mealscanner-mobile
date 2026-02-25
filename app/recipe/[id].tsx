import { ContentContainer } from '@/components/layout/ContentContainer';
import { PageContainer } from '@/components/layout/PageContainer';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ParallaxImage } from '@/components/ui/ParallaxImage';
import { SwirlingSpinner } from '@/components/ui/SwirlingSpinner';
import { Colors, glassBorder, glassSurface, neonGreen } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import { getRecipeImageSource } from '@/data/recipeImages';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRecipes, type PrebakedRecipe } from '@/hooks/useRecipes';
import { deleteRecipe, getRecipeWithDetails, saveRecipeAsMeal } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


// Mock recipe data - this will be replaced with Supabase data later
const mockRecipeDetails: Record<string, any> = {
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
  'd1': {
    id: 'd1',
    name: 'High Protein Salmon Bowl',
    image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
    prep_time: '10 min',
    cook_time: '10 min',
    difficulty: 'Easy',
    servings: 1,
    nutrition: { calories: 450, protein: 35, carbs: 10, fat: 28 },
    ingredients: [
      { name: 'Salmon fillet', amount: '6', unit: 'oz' },
      { name: 'Quinoa', amount: '1/2', unit: 'cup' },
      { name: 'Avocado', amount: '1/2', unit: 'medium' },
      { name: 'Spinach', amount: '1', unit: 'cup' }
    ],
    instructions: [
      'Season salmon with salt and pepper.',
      'Sear salmon in a pan for 4 minutes per side.',
      'Assemble bowl with quinoa, spinach, and avocado.',
      'Place salmon on top and enjoy!'
    ],
    tags: ['High Protein', 'Under 30 Mins']
  },
  'd2': {
    id: 'd2',
    name: 'Keto Avocado Salad',
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    prep_time: '15 min',
    cook_time: '0 min',
    difficulty: 'Easy',
    servings: 1,
    nutrition: { calories: 320, protein: 8, carbs: 12, fat: 28 },
    ingredients: [
      { name: 'Avocado', amount: '1', unit: 'large' },
      { name: 'Mixed greens', amount: '2', unit: 'cups' },
      { name: 'Cherry tomatoes', amount: '1/2', unit: 'cup' },
      { name: 'Olive oil', amount: '1', unit: 'tbsp' }
    ],
    instructions: [
      'Wash mixed greens and cherry tomatoes.',
      'Slice avocado and halve tomatoes.',
      'Combine all ingredients in a large bowl.',
      'Drizzle with olive oil and serve.'
    ],
    tags: ['Keto', 'Quick']
  },
  'd3': {
    id: 'd3',
    name: 'Quinoa Veggie Power Bowl',
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
    prep_time: '15 min',
    cook_time: '10 min',
    difficulty: 'Easy',
    servings: 1,
    nutrition: { calories: 380, protein: 12, carbs: 55, fat: 12 },
    ingredients: [
      { name: 'Quinoa', amount: '1/2', unit: 'cup' },
      { name: 'Roasted veggies', amount: '1', unit: 'cup' },
      { name: 'Hummus', amount: '2', unit: 'tbsp' },
      { name: 'Tahini', amount: '1', unit: 'tbsp' }
    ],
    instructions: [
      'Cook quinoa according to package instructions.',
      'Prepare or reheat roasted vegetables.',
      'Place quinoa and veggies in a bowl.',
      'Top with hummus and drizzle with tahini.'
    ],
    tags: ['Vegetarian', 'Fiber Rich']
  },
  'd4': {
    id: 'd4',
    name: 'Lemon Herb Grilled Chicken',
    image_url: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800',
    prep_time: '10 min',
    cook_time: '20 min',
    difficulty: 'Easy',
    servings: 2,
    nutrition: { calories: 290, protein: 42, carbs: 4, fat: 12 },
    ingredients: [
      { name: 'Chicken breast', amount: '2', unit: 'large' },
      { name: 'Lemon', amount: '1', unit: 'juiced' },
      { name: 'Dried herbs', amount: '2', unit: 'tsp' },
      { name: 'Olive oil', amount: '1', unit: 'tbsp' }
    ],
    instructions: [
      'Marinate chicken with lemon juice, herbs, and oil.',
      'Grill chicken for 6-8 minutes per side.',
      'Let rest for 5 minutes before slicing.',
      'Serve with a side salad if desired.'
    ],
    tags: ['Low Carb', 'High Protein']
  }
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
  const { user } = useAuth();
  const { getRecipeById } = useRecipes();
  
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients');
  const [recipe, setRecipe] = useState<any>(null);
  const [prebakedRecipe, setPrebakedRecipe] = useState<PrebakedRecipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [logging, setLogging] = useState(false);

  // Helper to format macro values to 1 decimal point max, removing trailing .0
  const formatMacro = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '0';
    return Number(val.toFixed(1)).toString();
  };

  useEffect(() => {
    loadRecipe();
  }, [id]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      console.log('🍳 Recipe Detail: Loading recipe with ID:', id);
      
      if (!id) {
        console.error('🍳 Recipe Detail: No ID provided');
        setLoading(false);
        return;
      }

      // First, check if it's a pre-baked recipe from JSON
      const prebaked = getRecipeById(id as string);
      if (prebaked) {
        console.log('🍳 Recipe Detail: Found pre-baked recipe:', prebaked.name);
        setPrebakedRecipe(prebaked);
        // Convert prebaked to recipe format for display
        setRecipe({
          id: prebaked.id,
          name: prebaked.name,
          description: prebaked.description,
          image_url: prebaked.image_url,
          prep_time: prebaked.prep_time,
          cook_time: prebaked.cook_time,
          difficulty: prebaked.difficulty,
          servings: prebaked.servings,
          ingredients: prebaked.ingredients,
          instructions: prebaked.instructions,
          tags: prebaked.tags.map(tag => 
            tag.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
          ),
          nutrition: prebaked.nutrition_per_serving,
        });
        setLoading(false);
        return;
      }

      // Check if it's a mock ID (legacy support)
      const isMock = typeof id === 'string' && (id.startsWith('d') || id === '1' || id === '2');
      
      if (isMock) {
        console.log('🍳 Recipe Detail: Loading mock data for ID:', id);
        const mockData = mockRecipeDetails[id as string];
        if (mockData) {
          setRecipe(mockData);
          setLoading(false);
          return;
        }
      }

      // Otherwise, load from Supabase (user-created recipes)
      const { data, error } = await getRecipeWithDetails(id as string);
      
      if (error) {
        console.error('🍳 Recipe Detail: Error loading recipe:', error);
      } else {
        console.log('🍳 Recipe Detail: Loaded recipe:', data?.name);
        setRecipe(data);
      }
    } catch (error) {
      console.error('🍳 Recipe Detail: Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogRecipe = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to log this recipe to your journal.');
      return;
    }

    if (!recipe) return;

    try {
      setLogging(true);
      console.log('🍳 Logging recipe to journal:', recipe.name);

      // Prepare recipe data for logging
      const recipeData = {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        image_url: recipe.image_url,
        servings: recipe.servings || 1,
        nutrition_per_serving: {
          calories: recipe.nutrition?.calories || 0,
          protein: recipe.nutrition?.protein || 0,
          carbs: recipe.nutrition?.carbs || 0,
          fat: recipe.nutrition?.fat || 0,
          fiber: recipe.nutrition?.fiber,
        },
        ingredients: recipe.ingredients,
        tags: recipe.tags,
      };

      const { data, error } = await saveRecipeAsMeal(user.id, recipeData, 1);

      if (error) {
        console.error('🍳 Error logging recipe:', error);
        Alert.alert('Error', 'Failed to log recipe to journal. Please try again.');
        return;
      }

      console.log('🍳 Recipe logged successfully:', data?.id);
      
      // Show success and navigate
      Alert.alert(
        'Recipe Logged!',
        `${recipe.name} has been added to your journal.`,
        [
          {
            text: 'View Journal',
            onPress: () => router.push('/(tabs)/journal'),
          },
          {
            text: 'Stay Here',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('🍳 Error logging recipe:', error);
      Alert.alert('Error', 'Failed to log recipe to journal. Please try again.');
    } finally {
      setLogging(false);
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
              router.replace('/(tabs)/journal/recipes');
              
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
      <PageContainer noPadding>
        {/* Skeleton Header */}
        <View style={[styles.floatingHeader, { paddingTop: insets.top + Spacing.sm }]}>
          <View style={styles.headerContent}>
            <View style={[styles.iconContainer, { opacity: 0.3 }]}>
              <View style={styles.iconBackground} />
            </View>
            <View style={styles.headerActions}>
              <View style={[styles.iconContainer, { opacity: 0.3 }]}>
                <View style={styles.iconBackground} />
              </View>
            </View>
          </View>
        </View>

        <ContentContainer>
          {/* Skeleton Hero Image */}
          <View style={[styles.skeletonImage, { height: 380, backgroundColor: colors.border, opacity: 0.3 }]} />

          {/* Skeleton Title Card */}
          <AnimatedCard delay={0} style={styles.titleCard}>
            <View style={styles.titleHeader}>
              <View style={[styles.skeletonText, { width: '70%', height: 32, backgroundColor: colors.border, opacity: 0.3, borderRadius: 8 }]} />
              <View style={[styles.skeletonBadge, { width: 80, height: 28, backgroundColor: colors.border, opacity: 0.3, borderRadius: 16 }]} />
            </View>
            <View style={styles.metaContainer}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={styles.metaItem}>
                  <View style={[styles.skeletonIcon, { width: 20, height: 20, backgroundColor: colors.border, opacity: 0.3, borderRadius: 4 }]} />
                  <View>
                    <View style={[styles.skeletonText, { width: 40, height: 12, backgroundColor: colors.border, opacity: 0.3, borderRadius: 4, marginBottom: 4 }]} />
                    <View style={[styles.skeletonText, { width: 60, height: 16, backgroundColor: colors.border, opacity: 0.3, borderRadius: 4 }]} />
                  </View>
                </View>
              ))}
            </View>
          </AnimatedCard>

          {/* Skeleton Nutrition Card */}
          <AnimatedCard delay={0}>
            <View style={styles.sectionHeader}>
              <View style={[styles.skeletonIcon, { width: 24, height: 24, backgroundColor: colors.border, opacity: 0.3, borderRadius: 4 }]} />
              <View style={[styles.skeletonText, { width: 180, height: 20, backgroundColor: colors.border, opacity: 0.3, borderRadius: 4 }]} />
            </View>
            <View style={styles.nutritionRow}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={styles.nutritionItem}>
                  <View style={[styles.skeletonText, { width: 40, height: 24, backgroundColor: colors.border, opacity: 0.3, borderRadius: 4, marginBottom: 4 }]} />
                  <View style={[styles.skeletonText, { width: 50, height: 12, backgroundColor: colors.border, opacity: 0.3, borderRadius: 4 }]} />
                </View>
              ))}
            </View>
          </AnimatedCard>

          {/* Skeleton Tab Selector */}
          <AnimatedCard delay={0}>
            <View style={[styles.skeletonCard, { height: 50, backgroundColor: colors.border, opacity: 0.3, borderRadius: 12 }]} />
          </AnimatedCard>

          {/* Skeleton Content */}
          <AnimatedCard delay={0}>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={[styles.skeletonText, { width: '100%', height: 20, backgroundColor: colors.border, opacity: 0.3, borderRadius: 4, marginBottom: Spacing.md }]} />
            ))}
          </AnimatedCard>
        </ContentContainer>
      </PageContainer>
    );
  }

  if (!recipe) {
    return (
      <PageContainer>
        <ContentContainer scrollable={false}>
          <View style={styles.errorContainer}>
            <IconSymbol name="exclamationmark.triangle" size={64} color={colors.icon} />
            <Text style={[TextStyles.h3, { color: colors.text, marginTop: Spacing.base }]}>
              Recipe Not Found
            </Text>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.tint }]}
              onPress={() => router.back()}
            >
              <Text style={[TextStyles.button, { color: 'white' }]}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </ContentContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer noPadding>
      {/* Floating Header - Actions only, no title */}
      <View style={[styles.floatingHeader, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground} />
              <View style={styles.iconGlow}>
                <IconSymbol name="chevron.left" size={22} color={neonGreen} style={styles.iconThick} />
              </View>
            </View>
          </TouchableOpacity>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButtonDelete}
              onPress={handleDeleteRecipe}
              disabled={deleting}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <View style={styles.iconBackground} />
                <View style={styles.iconGlow}>
                  <IconSymbol name="trash" size={18} color={neonGreen} style={styles.iconThick} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ContentContainer>
        {/* Hero Image with Parallax */}
        {(recipe.image_url || recipe.id) && (
          <ParallaxImage 
            source={getRecipeImageSource(recipe.id, recipe.image_url) || { uri: recipe.image_url }} 
            height={380} 
          />
        )}

        {/* Title Card - Elevated */}
        <AnimatedCard delay={100} style={styles.titleCard}>
          <View style={styles.titleHeader}>
            <Text style={[TextStyles.h1, { color: colors.text, flex: 1 }]}>
              {recipe.name}
            </Text>
            {recipe.difficulty && (
              <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(recipe.difficulty) }]}>
                <Text style={[TextStyles.bodySmall, { color: 'white', fontWeight: '600' }]}>
                  {recipe.difficulty}
                </Text>
              </View>
            )}
          </View>
          
          {/* Meta Info */}
          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              {recipe.prep_time && (
                <View style={styles.metaItem}>
                  <IconSymbol name="clock" size={20} color={colors.icon} />
                  <View>
                    <Text style={[TextStyles.caption, { color: colors.icon }]}>Prep</Text>
                    <Text style={[TextStyles.bodyMedium, { color: colors.text }]}>{recipe.prep_time}</Text>
                  </View>
                </View>
              )}
              
              {recipe.cook_time && (
                <View style={styles.metaItem}>
                  <IconSymbol name="flame" size={20} color={colors.icon} />
                  <View>
                    <Text style={[TextStyles.caption, { color: colors.icon }]}>Cook</Text>
                    <Text style={[TextStyles.bodyMedium, { color: colors.text }]}>{recipe.cook_time}</Text>
                  </View>
                </View>
              )}
              
              {recipe.servings && (
                <View style={styles.metaItem}>
                  <IconSymbol name="person.2" size={20} color={colors.icon} />
                  <View>
                    <Text style={[TextStyles.caption, { color: colors.icon }]}>Servings</Text>
                    <Text style={[TextStyles.bodyMedium, { color: colors.text }]}>{recipe.servings}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </AnimatedCard>

        {/* Nutrition Info */}
        {recipe.nutrition && (
          <AnimatedCard delay={200}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="chart.bar" size={24} color={colors.tint} />
              <Text style={[TextStyles.h4, { color: colors.text }]}>
                Nutrition per serving
              </Text>
            </View>
            <View style={styles.nutritionRow}>
              <View style={styles.nutritionItem}>
                <Text style={[TextStyles.h3, { color: colors.tint }]}>{formatMacro(recipe.nutrition.calories)}</Text>
                <Text style={[TextStyles.caption, { color: colors.icon }]}>Calories</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={[TextStyles.h3, { color: colors.tint }]}>{formatMacro(recipe.nutrition.protein)}g</Text>
                <Text style={[TextStyles.caption, { color: colors.icon }]}>Protein</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={[TextStyles.h3, { color: colors.tint }]}>{formatMacro(recipe.nutrition.carbs)}g</Text>
                <Text style={[TextStyles.caption, { color: colors.icon }]}>Carbs</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={[TextStyles.h3, { color: colors.tint }]}>{formatMacro(recipe.nutrition.fat)}g</Text>
                <Text style={[TextStyles.caption, { color: colors.icon }]}>Fat</Text>
              </View>
            </View>
          </AnimatedCard>
        )}

        {/* Tab Selector */}
        <AnimatedCard delay={300}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'ingredients' && { backgroundColor: neonGreen }
              ]}
              onPress={() => setActiveTab('ingredients')}
            >
              <Text style={[
                TextStyles.button,
                { color: activeTab === 'ingredients' ? '#000000' : colors.text }
              ]}>
                Ingredients ({getIngredients().length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'instructions' && { backgroundColor: neonGreen }
              ]}
              onPress={() => setActiveTab('instructions')}
            >
              <Text style={[
                TextStyles.button,
                { color: activeTab === 'instructions' ? '#000000' : colors.text }
              ]}>
                Instructions ({getInstructions().length})
              </Text>
            </TouchableOpacity>
          </View>
        </AnimatedCard>

        {/* Tab Content */}
        <AnimatedCard delay={400}>
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
                  <View style={[styles.stepNumber, { backgroundColor: neonGreen }]}>
                    <Text style={[TextStyles.bodyMedium, { color: '#000000', fontWeight: '600' }]}>
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
        </AnimatedCard>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <AnimatedCard delay={500}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="tag" size={24} color={colors.tint} />
              <Text style={[TextStyles.h4, { color: colors.text }]}>
                Tags
              </Text>
            </View>
            <View style={styles.tagsRow}>
              {recipe.tags.map((tag, index) => (
                <View key={index} style={[styles.tag, { backgroundColor: colors.surface }]}>
                  <Text style={[TextStyles.caption, { color: colors.text }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </AnimatedCard>
        )}
        
        {/* Spacer for fixed footer */}
        <View style={{ height: 100 }} />
      </ContentContainer>

      {/* Fixed Footer - Log Recipe Button */}
      <View style={[styles.footerContainer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TouchableOpacity
          style={[styles.logRecipeButton, logging && styles.logRecipeButtonDisabled]}
          onPress={handleLogRecipe}
          disabled={logging}
          activeOpacity={0.8}
        >
          {logging ? (
            <SwirlingSpinner size="small" color="#000000" />
          ) : (
            <IconSymbol name="plus.circle.fill" size={24} color="#000000" />
          )}
          <Text style={[TextStyles.button, { color: '#000000' }]}>
            {logging ? 'Logging...' : 'Log to Journal'}
          </Text>
        </TouchableOpacity>
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'transparent',
    paddingHorizontal: PageSpacing.containerPadding,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    padding: Spacing.sm,
  },
  headerButtonDelete: {
    padding: Spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBackground: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    ...(Platform.OS === 'web' && {
      filter: 'blur(8px)',
    }),
    ...(Platform.OS !== 'web' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 12,
    }),
  },
  iconThick: {
    fontWeight: '900',
    ...(Platform.OS === 'web' && {
      textShadow: '0 0 2px rgba(74, 222, 128, 0.8)',
    }),
  },
  iconGlow: {
    shadowColor: neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
    // Additional glow layers for web
    ...(Platform.OS === 'web' && {
      filter: 'drop-shadow(0 0 8px rgba(74, 222, 128, 1)) drop-shadow(0 0 16px rgba(74, 222, 128, 0.8))',
    }),
  },
  titleCard: {
    marginTop: -20,
    marginBottom: PageSpacing.sectionGap,
    paddingTop: Spacing.xl,
  },
  titleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  difficultyBadge: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  metaContainer: {
    marginTop: Spacing.base,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  ingredientsContainer: {
    gap: Spacing.sm,
  },
  ingredientItem: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  ingredientContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instructionsContainer: {
    gap: Spacing.base,
  },
  instructionItem: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
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
  skeletonImage: {
    width: '100%',
    borderRadius: 0,
  },
  skeletonText: {
    borderRadius: 4,
  },
  skeletonBadge: {
    borderRadius: 16,
  },
  skeletonIcon: {
    borderRadius: 4,
  },
  skeletonCard: {
    borderRadius: 12,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: PageSpacing.containerPadding,
    paddingTop: Spacing.md,
    backgroundColor: glassSurface,
    borderTopWidth: 1,
    borderTopColor: glassBorder,
  },
  logRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: neonGreen,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 10,
    shadowColor: neonGreen,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logRecipeButtonDisabled: {
    opacity: 0.7,
  },
}); 