import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { HeroImage } from '@/components/ui/OptimizedImage';
import { Colors } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { deleteMeal, getMealById } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface Meal {
  id: string;
  description: string;
  image_url?: string;
  user_id: string;
  ingredients?: string[];
  serving_estimate?: string;
  calories?: number;
  macros?: {
    protein?: number;
    fat?: number;
    carbs?: number;
    fiber?: number;
  };
  health_score?: 'healthy' | 'moderately_healthy' | 'unhealthy';
  qualitative_feedback?: string;
  created_at: string;
  ai_analysis?: any;
  nutrition_confidence?: number;
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
}

const { width } = Dimensions.get('window');

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [meal, setMeal] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadMealDetail();
    }
  }, [id]);

  const loadMealDetail = async () => {
    try {
      const { data, error } = await getMealById(id);
      if (error) {
        console.error('Error loading meal:', error);
        Alert.alert('Error', 'Failed to load meal details');
        router.back();
        return;
      }
      setMeal(data);
    } catch (error) {
      console.error('Error loading meal:', error);
      Alert.alert('Error', 'Failed to load meal details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!meal) return;
    
    Alert.alert(
      'Delete Meal',
      'Are you sure you want to delete this meal? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await deleteMeal(meal.id);
              if (error) {
                Alert.alert('Error', 'Failed to delete meal');
                return;
              }
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete meal');
            }
          }
        }
      ]
    );
  };

  const getMealType = (createdAt: string): string => {
    const hour = new Date(createdAt).getHours();
    if (hour < 11) return 'Breakfast';
    if (hour < 16) return 'Lunch';
    if (hour < 19) return 'Dinner';
    return 'Snack';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getHealthScoreStyle = (healthScore?: string) => {
    switch (healthScore) {
      case 'healthy':
        return { backgroundColor: '#10B981', color: 'white' };
      case 'moderately_healthy':
        return { backgroundColor: '#F59E0B', color: 'white' };
      case 'unhealthy':
        return { backgroundColor: '#EF4444', color: 'white' };
      default:
        return { backgroundColor: '#6B7280', color: 'white' };
    }
  };

  const getHealthScoreText = (healthScore?: string) => {
    switch (healthScore) {
      case 'healthy':
        return 'Healthy';
      case 'moderately_healthy':
        return 'Moderately Healthy';
      case 'unhealthy':
        return 'Needs Improvement';
      default:
        return 'Not Analyzed';
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <IconSymbol name="hourglass" size={32} color={colors.icon} />
                  <Text style={[TextStyles.body, { color: colors.icon }]}>
          Loading meal details...
        </Text>
        </View>
      </ThemedView>
    );
  }

  if (!meal) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <IconSymbol name="exclamationmark.triangle" size={32} color={colors.icon} />
          <Text style={[TextStyles.body, { color: colors.icon }]}>
            Meal not found
          </Text>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[TextStyles.h2, { color: colors.text }]}>
          Meal Details
        </Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.surface }]}
            onPress={() => Alert.alert('Edit', 'Edit functionality coming soon!')}
          >
            <IconSymbol name="pencil" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.deleteButton, { backgroundColor: '#EF4444' }]}
            onPress={handleDelete}
          >
            <IconSymbol name="trash" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Meal Image */}
        {meal.image_url && (
          <View style={styles.imageContainer}>
            <HeroImage source={{ uri: meal.image_url }} style={styles.mealImage} />
            <View style={styles.imageOverlay}>
              <View style={[styles.healthBadge, getHealthScoreStyle(meal.health_score)]}>
                <IconSymbol name="checkmark.seal" size={16} color="white" />
                <Text style={[TextStyles.caption, { color: 'white' }]}>
                  {getHealthScoreText(meal.health_score)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Meal Title and Meta */}
        <View style={[styles.titleSection, { backgroundColor: colors.surface }]}>
          <Text style={[TextStyles.h3, { color: colors.text }]}>
            {meal.description}
          </Text>
          
          <View style={styles.metaRow}>
            <View style={styles.mealTypeContainer}>
              <View style={[styles.mealTypeBadge, { backgroundColor: colors.tint }]}>
                <Text style={TextStyles.caption}>{getMealType(meal.created_at)}</Text>
              </View>
            </View>
            
            <View style={styles.dateTimeContainer}>
              <IconSymbol name="calendar" size={16} color={colors.icon} />
              <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
                {formatDate(meal.created_at)}
              </Text>
            </View>
          </View>
          
          <View style={styles.timeRow}>
            <IconSymbol name="clock" size={16} color={colors.icon} />
            <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
              {formatTime(meal.created_at)}
            </Text>
          </View>
        </View>

        {/* Nutrition Overview */}
        {meal.calories && (
          <View style={[styles.section, styles.nutritionSection, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="chart.bar" size={20} color={colors.tint} />
              <Text style={[TextStyles.h4, { color: colors.text }]}>
                Nutrition Overview
              </Text>
            </View>
            
            <View style={styles.nutritionGrid}>
              <View style={[styles.nutritionCard, { backgroundColor: colors.background }]}>
                <Text style={[TextStyles.bodyMedium, { color: colors.tint }]}>
                  {meal.calories}
                </Text>
                <Text style={[TextStyles.caption, { color: colors.icon }]}>
                  Calories
                </Text>
              </View>
              
              {meal.macros && (
                <>
                  <View style={[styles.nutritionCard, { backgroundColor: colors.background }]}>
                    <Text style={[TextStyles.bodyMedium, { color: '#10B981' }]}>
                      {meal.macros.protein || 0}g
                    </Text>
                    <Text style={[TextStyles.caption, { color: colors.icon }]}>
                      Protein
                    </Text>
                  </View>
                  
                  <View style={[styles.nutritionCard, { backgroundColor: colors.background }]}>
                    <Text style={[TextStyles.bodyMedium, { color: '#F59E0B' }]}>
                      {meal.macros.fat || 0}g
                    </Text>
                    <Text style={[TextStyles.caption, { color: colors.icon }]}>
                      Fat
                    </Text>
                  </View>
                  
                  <View style={[styles.nutritionCard, { backgroundColor: colors.background }]}>
                    <Text style={[TextStyles.bodyMedium, { color: '#3B82F6' }]}>
                      {meal.macros.carbs || 0}g
                    </Text>
                    <Text style={[TextStyles.caption, { color: colors.icon }]}>
                      Carbs
                    </Text>
                  </View>
                  
                  {meal.macros.fiber && (
                    <View style={[styles.nutritionCard, { backgroundColor: colors.background }]}>
                      <Text style={[TextStyles.bodyMedium, { color: '#8B5CF6' }]}>
                        {meal.macros.fiber}g
                      </Text>
                      <Text style={[TextStyles.caption, { color: colors.icon }]}>
                        Fiber
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
            
            {meal.nutrition_confidence && (
              <View style={styles.confidenceRow}>
                <IconSymbol name="checkmark.seal" size={14} color={colors.tint} />
                <Text style={[TextStyles.caption, { color: colors.icon }]}>
                  {Math.round(meal.nutrition_confidence * 100)}% confidence in nutrition analysis
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Ingredients */}
        {meal.ingredients && meal.ingredients.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="list.bullet" size={20} color={colors.tint} />
              <Text style={[TextStyles.h4, { color: colors.text }]}>
                Ingredients
              </Text>
            </View>
            
            <View style={styles.ingredientsList}>
              {meal.ingredients.map((ingredient, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <View style={[styles.ingredientDot, { backgroundColor: colors.tint }]} />
                  <Text style={[TextStyles.body, { color: colors.text }]}>
                    {ingredient}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Serving Size */}
        {meal.serving_estimate && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="scalemass" size={20} color={colors.tint} />
              <Text style={[TextStyles.h4, { color: colors.text }]}>
                Serving Size
              </Text>
            </View>
            
            <Text style={[TextStyles.body, { color: colors.text }]}>
              {meal.serving_estimate}
            </Text>
          </View>
        )}

        {/* AI Feedback */}
        {meal.qualitative_feedback && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="brain.head.profile" size={20} color={colors.tint} />
              <Text style={[TextStyles.h4, { color: colors.text }]}>
                AI Health Assessment
              </Text>
            </View>
            
            <Text style={[TextStyles.body, { color: colors.text }]}>
              {meal.qualitative_feedback}
            </Text>
          </View>
        )}

        {/* Recommendations */}
        {meal.ai_analysis?.recommendations && meal.ai_analysis.recommendations.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="lightbulb" size={20} color={colors.tint} />
              <Text style={[TextStyles.h4, { color: colors.text }]}>
                Recommendations
              </Text>
            </View>
            
            <View style={styles.recommendationsList}>
              {meal.ai_analysis.recommendations.map((rec: any, index: number) => (
                <View key={index} style={[styles.recommendationItem, { backgroundColor: colors.background }]}>
                  <View style={styles.recommendationHeader}>
                    <View style={[
                      styles.priorityBadge, 
                      { 
                        backgroundColor: rec.priority === 3 ? '#EF4444' : 
                                        rec.priority === 2 ? '#F59E0B' : '#10B981' 
                      }
                    ]}>
                      <Text style={TextStyles.caption}>
                        {rec.priority === 3 ? 'High' : rec.priority === 2 ? 'Med' : 'Low'}
                      </Text>
                    </View>
                    <Text style={[TextStyles.caption, { color: colors.icon }]}>
                      {rec.type?.charAt(0).toUpperCase() + rec.type?.slice(1) || 'General'}
                    </Text>
                  </View>
                  <Text style={[TextStyles.body, { color: colors.text }]}>
                    {rec.content}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Processing Status */}
        {meal.processing_status && meal.processing_status !== 'completed' && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <IconSymbol 
                name={meal.processing_status === 'processing' ? 'hourglass' : 
                     meal.processing_status === 'failed' ? 'exclamationmark.triangle' : 'checkmark.circle'} 
                size={20} 
                color={meal.processing_status === 'processing' ? '#F59E0B' : 
                       meal.processing_status === 'failed' ? '#EF4444' : colors.tint} 
              />
              <Text style={[TextStyles.h4, { color: colors.text }]}>
                Analysis Status
              </Text>
            </View>
            
            <Text style={[TextStyles.body, { color: colors.text }]}>
              {meal.processing_status === 'processing' ? 'AI analysis in progress...' :
               meal.processing_status === 'failed' ? 'Analysis failed - please try again' :
               'Analysis pending'}
            </Text>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
  },
  imageContainer: {
    position: 'relative',
  },
  mealImage: {
    width: width,
    height: 300,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  healthBadgeText: {
  },
  titleSection: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  mealTitle: {
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  mealTypeContainer: {
    flexDirection: 'row',
  },
  mealTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  mealTypeText: {
    color: 'white',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
  },
  section: {
    margin: 20,
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
  },
  nutritionSection: {
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  nutritionCard: {
    flex: 1,
    minWidth: 80,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nutritionValue: {
    marginBottom: 4,
  },
  nutritionLabel: {
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confidenceText: {
  },
  ingredientsList: {
    gap: 8,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  ingredientText: {
  },
  servingText: {
  },
  feedbackText: {
    lineHeight: 24,
  },
  recommendationsList: {
    gap: 12,
  },
  recommendationItem: {
    padding: 16,
    borderRadius: 12,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    color: 'white',
  },
  recommendationType: {
    textTransform: 'capitalize',
  },
  recommendationContent: {
    lineHeight: 20,
  },
  statusText: {
  },
}); 