import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThumbnailImage } from '@/components/ui/OptimizedImage';
import { Colors } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { deleteMeal, getCurrentUser, getUserMeals, supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
  };
  health_score?: 'healthy' | 'moderately_healthy' | 'unhealthy';
  fiber_score?: string;
  qualitative_feedback?: string;
  recipe?: string;
  created_at: string;
  // AI Analysis fields
  ai_analysis?: any;
  nutrition_confidence?: number;
  analysis_version?: string;
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
}

export default function JournalScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'today' | 'week' | 'all'>('all');
  // Mobile uses list view only, web can toggle between grid and list
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(Platform.OS === 'web' ? 'grid' : 'list');

  useEffect(() => {
    checkUserAndLoadMeals();
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
        if (session?.user) {
          loadMeals(session.user.id);
        } else {
          setMeals([]);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUserAndLoadMeals = async () => {
    setLoading(true);
    try {
      const { user } = await getCurrentUser();
      console.log('🔍 Journal: Current user:', user?.id || 'No user');
      setUser(user);
      if (user) {
        await loadMeals(user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMeals = async (userId: string) => {
    try {
      console.log('🔍 Journal: Loading meals for user ID:', userId);
      const { data, error } = await getUserMeals(userId, 50);
      if (error) {
        console.error('Error loading meals:', error);
        Alert.alert('Error', 'Failed to load meals');
        return;
      }
      console.log('🔍 Journal: Received meals data:', data);
      console.log('🔍 Journal: Number of meals:', data?.length || 0);
      setMeals(data || []);
    } catch (error) {
      console.error('Error loading meals:', error);
      Alert.alert('Error', 'Failed to load meals');
    }
  };

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await loadMeals(user.id);
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

  const getMealType = (createdAt: string): string => {
    const hour = new Date(createdAt).getHours();
    if (hour < 11) return 'Breakfast';
    if (hour < 16) return 'Lunch';
    if (hour < 19) return 'Dinner';
    return 'Snack';
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
        return 'Moderate';
      case 'unhealthy':
        return 'Unhealthy';
      default:
        return 'Unknown';
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

  const renderMealCard = ({ item: meal }: { item: Meal }) => (
    <TouchableOpacity 
      style={[
        styles.mealCard, 
        { backgroundColor: colors.background, borderColor: colors.border },
        viewMode === 'grid' && styles.gridCard
      ]}
      onPress={() => {
        router.push(`/meal/${meal.id}`);
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.mealTypeContainer}>
          <View style={[styles.mealTypeBadge, { backgroundColor: colors.icon }]}>
            <Text style={[TextStyles.caption, { color: 'white' }]}>{getMealType(meal.created_at)}</Text>
          </View>
          {meal.health_score && (
            <View style={[styles.healthBadge, getHealthScoreStyle(meal.health_score)]}>
                      <Text style={[TextStyles.caption, { color: getHealthScoreStyle(meal.health_score).color }]}>
          {getHealthScoreText(meal.health_score)}
        </Text>
            </View>
          )}
          {/* AI Analysis Status Badge */}
          {meal.processing_status && (
            <View style={[
              styles.statusBadge, 
              { 
                backgroundColor: meal.processing_status === 'completed' ? '#10B981' : 
                                meal.processing_status === 'processing' ? '#F59E0B' :
                                meal.processing_status === 'failed' ? '#EF4444' : '#6B7280'
              }
            ]}>
              <Text style={[TextStyles.caption, { color: 'white' }]}>
                {meal.processing_status === 'completed' ? 'AI' : 
                 meal.processing_status === 'processing' ? '...' :
                 meal.processing_status === 'failed' ? '!' : '?'}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={(e) => {
            console.log('🚨 DELETE BUTTON CLICKED! Event:', e);
            e.stopPropagation();
            console.log('🚨 About to call handleDeleteMeal with ID:', meal.id);
            handleDeleteMeal(meal.id);
          }}
          activeOpacity={0.6}
        >
          <IconSymbol name="trash" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {meal.image_url && (
        <ThumbnailImage source={{ uri: meal.image_url }} style={styles.mealImage} />
      )}

      <View style={styles.cardContent}>
        <Text style={[TextStyles.h4, { color: colors.text }]} numberOfLines={2}>
          {meal.description}
        </Text>
        
        <View style={styles.mealMeta}>
          <View style={styles.dateTimeContainer}>
            <IconSymbol name="calendar" size={14} color={colors.icon} />
            <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
              {formatDate(meal.created_at)}
            </Text>
          </View>
          
          {meal.calories && (
            <Text style={[TextStyles.bodyMedium, { color: colors.tint }]}>
              {meal.calories} calories
            </Text>
          )}
        </View>

        {meal.macros && (
          <View style={styles.macrosContainer}>
            <Text style={[TextStyles.caption, { color: colors.icon }]}>
              P: {meal.macros.protein || 0}g
            </Text>
            <Text style={[TextStyles.caption, { color: colors.icon }]}>
              F: {meal.macros.fat || 0}g
            </Text>
            <Text style={[TextStyles.caption, { color: colors.icon }]}>
              C: {meal.macros.carbs || 0}g
            </Text>
          </View>
        )}

        {/* AI Analysis Confidence Score */}
        {meal.nutrition_confidence && meal.nutrition_confidence > 0 && (
          <View style={styles.confidenceContainer}>
            <IconSymbol name="checkmark.seal" size={12} color={colors.tint} />
            <Text style={[TextStyles.caption, { color: colors.icon }]}>
              {Math.round(meal.nutrition_confidence * 100)}% confidence
            </Text>
          </View>
        )}

        {/* AI Qualitative Feedback Preview */}
        {meal.qualitative_feedback && (
          <View style={styles.feedbackContainer}>
            <Text style={[TextStyles.bodySmall, { color: colors.icon, fontStyle: 'italic', lineHeight: 16 }]} numberOfLines={2}>
              {meal.qualitative_feedback}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <IconSymbol name="person" size={48} color={colors.icon} />
          <Text style={[TextStyles.h3, { color: colors.text, textAlign: 'center' }]}>Sign in to view your journal</Text>
          <Text style={[TextStyles.body, { color: colors.icon, textAlign: 'center', lineHeight: 24 }]}>
            Your meal history will appear here once you're signed in
          </Text>
          <TouchableOpacity 
            style={[styles.signInButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/(tabs)/auth')}
          >
            <Text style={[TextStyles.button, { color: 'white' }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[TextStyles.h2, { color: colors.text }]}>Meal Journal</Text>
            <Text style={[TextStyles.body, { color: colors.icon, marginTop: 4 }]}>
              Browse and search your meal history
            </Text>
          </View>
        </View>
      </View>

      {/* Search and Controls */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.icon} />
          <TextInput
            style={[TextStyles.body, { color: colors.text, flex: 1 }]}
            placeholder="Search meals..."
            placeholderTextColor={colors.icon}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        {/* Only show view controls on web - mobile always uses list view */}
        {Platform.OS === 'web' && (
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
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterButtons}>
          <TouchableOpacity 
            style={[styles.filterButton, selectedFilter === 'today' && { backgroundColor: colors.tint }]}
            onPress={() => setSelectedFilter('today')}
          >
            <Text style={[TextStyles.button, selectedFilter === 'today' ? { color: 'white' } : { color: '#6B7280' }]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, selectedFilter === 'week' && { backgroundColor: colors.tint }]}
            onPress={() => setSelectedFilter('week')}
          >
            <Text style={[TextStyles.button, selectedFilter === 'week' ? { color: 'white' } : { color: '#6B7280' }]}>
              This Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, selectedFilter === 'all' && { backgroundColor: colors.tint }]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[TextStyles.button, selectedFilter === 'all' ? { color: 'white' } : { color: '#6B7280' }]}>
              All
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Meals List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <IconSymbol name="hourglass" size={32} color={colors.icon} />
          <Text style={[TextStyles.body, { color: colors.icon }]}>Loading meals...</Text>
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
            <TouchableOpacity 
              style={[styles.captureButton, { backgroundColor: colors.tint }]}
              onPress={() => router.push('/(tabs)/log')}
            >
              <IconSymbol name="camera" size={20} color="white" />
              <Text style={[TextStyles.button, { color: 'white' }]}>Capture Meal</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredMeals}
          renderItem={renderMealCard}
          keyExtractor={(item) => item.id}
          numColumns={Platform.OS === 'web' ? (viewMode === 'grid' ? 2 : 1) : 1}
          key={viewMode} // Force re-render when view mode changes
          contentContainerStyle={styles.mealsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    marginBottom: 4,
  },
  headerSubtitle: {
  },

  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    gap: 12,
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
  searchInput: {
    flex: 1,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  filterButtonText: {
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  mealsList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  mealCard: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gridCard: {
    flex: 1,
    margin: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  mealTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mealTypeText: {
    color: 'white',
  },
  healthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  healthBadgeText: {
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  statusBadgeText: {
    color: 'white',
  },
  deleteButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  mealImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 16,
  },
  mealTitle: {
    marginBottom: 8,
  },
  mealMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTime: {
  },
  calories: {
  },
  macrosContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  macroText: {
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  confidenceText: {
  },
  feedbackContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(107, 114, 128, 0.2)',
  },
  feedbackText: {
    lineHeight: 16,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 24,
  },
  signInButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 8,
  },
  signInButtonText: {
    color: 'white',
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 8,
  },
  captureButtonText: {
    color: 'white',
  },
}); 