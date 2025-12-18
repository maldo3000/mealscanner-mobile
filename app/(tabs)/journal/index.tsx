import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThumbnailImage } from '@/components/ui/OptimizedImage';
import { Tag } from '@/components/ui/Tag';
import { Colors, glassBorder, glassSurface, neonGreen, primaryGreen } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
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

export default function MealsScreen() {
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

  const getHealthScoreTagColor = (healthScore?: string): 'default' | 'accent' | 'muted' | undefined => {
    switch (healthScore) {
      case 'healthy':
        return 'accent';
      case 'moderately_healthy':
        return 'default';
      case 'unhealthy':
        return 'muted';
      default:
        return undefined;
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

  const getMealTypeTagColor = (mealType: string): 'default' | 'accent' | 'muted' => {
    switch (mealType) {
      case 'Breakfast':
        return 'accent';
      case 'Lunch':
        return 'accent';
      case 'Dinner':
        return 'accent';
      default:
        return 'default';
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
        viewMode === 'grid' && styles.gridCard
      ]}
      onPress={() => {
        router.push(`/meal/${meal.id}`);
      }}
      activeOpacity={0.7}
    >
      <Card variant="glass" style={styles.mealCard}>
        {meal.image_url && (
          <ThumbnailImage source={{ uri: meal.image_url }} style={styles.mealImage} />
        )}

        <View style={styles.cardContent}>
          <Text style={[TextStyles.body, { color: colors.text, marginBottom: Spacing.md, fontWeight: '600' }]} numberOfLines={2}>
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
              <Text style={[TextStyles.bodyLarge, { color: primaryGreen, fontWeight: '700' }]}>
                {meal.calories} cal
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
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <PageContainer>
        <View style={styles.emptyContainer}>
          <IconSymbol name="person" size={48} color={colors.icon} />
          <Text style={[TextStyles.h3, { color: colors.text, textAlign: 'center' }]}>Sign in to view your journal</Text>
          <Text style={[TextStyles.body, { color: colors.icon, textAlign: 'center', lineHeight: 24 }]}>
            Your meal history will appear here once you're signed in
          </Text>
          <Button
            variant="primary"
            onPress={() => router.push('/(tabs)/auth')}
            style={styles.signInButton}
          >
            Sign In
          </Button>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Meals"
        subtitle="Browse and search your meal history"
      />

      {/* Search and Controls */}
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
        
        {/* Only show view controls on web - mobile always uses list view */}
        {Platform.OS === 'web' && (
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
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterButtons}>
          <TouchableOpacity 
            style={[styles.filterButton, selectedFilter === 'today' && styles.filterButtonActive]}
            onPress={() => setSelectedFilter('today')}
          >
            <Text style={[TextStyles.button, { color: selectedFilter === 'today' ? 'white' : colors.icon }]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, selectedFilter === 'week' && styles.filterButtonActive]}
            onPress={() => setSelectedFilter('week')}
          >
            <Text style={[TextStyles.button, { color: selectedFilter === 'week' ? 'white' : colors.icon }]}>
              This Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, selectedFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[TextStyles.button, { color: selectedFilter === 'all' ? 'white' : colors.icon }]}>
              All
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Meals List */}
      {loading ? (
        <View style={styles.mealsList}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.mealCard}>
              <Card variant="glass" style={styles.mealCard}>
                <View style={[styles.skeletonImage, { width: '100%', height: 200, backgroundColor: colors.border, opacity: 0.3, borderRadius: 16, marginBottom: 8 }]} />
                <View style={styles.cardContent}>
                  <View style={[styles.skeletonText, { width: '80%', height: 20, backgroundColor: colors.border, opacity: 0.3, borderRadius: 4, marginBottom: Spacing.md }]} />
                  <View style={styles.mealMeta}>
                    <View style={[styles.skeletonText, { width: 120, height: 14, backgroundColor: colors.border, opacity: 0.3, borderRadius: 4 }]} />
                    <View style={[styles.skeletonText, { width: 60, height: 16, backgroundColor: colors.border, opacity: 0.3, borderRadius: 4 }]} />
                  </View>
                  <View style={styles.macrosContainer}>
                    {[1, 2, 3].map((j) => (
                      <View key={j} style={[styles.skeletonText, { width: 50, height: 12, backgroundColor: colors.border, opacity: 0.3, borderRadius: 4 }]} />
                    ))}
                  </View>
                </View>
              </Card>
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
  signInButton: {
    marginTop: Spacing.base,
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
    marginBottom: PageSpacing.containerPadding,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: glassBorder,
  },
  filterButtonActive: {
    backgroundColor: neonGreen,
    borderColor: neonGreen,
  },
  mealsList: {
    paddingBottom: 100,
  },
  mealCard: {
    marginBottom: PageSpacing.cardGap,
    overflow: 'hidden',
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
    flexWrap: 'wrap',
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
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 8,
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
    marginTop: 8,
  },
  captureButton: {
    marginTop: 8,
  },
  skeletonImage: {
    borderRadius: 16,
  },
  skeletonText: {
    borderRadius: 4,
  },
  skeletonBadge: {
    borderRadius: 16,
  },
  skeletonIcon: {
    borderRadius: 9,
  },
});

