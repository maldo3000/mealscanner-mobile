import { AnalysisLoadingOverlay, AnalysisStatus } from '@/components/capture/AnalysisLoadingOverlay';
import { ContentContainer } from '@/components/layout/ContentContainer';
import { PageContainer } from '@/components/layout/PageContainer';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { AnimatedCard } from '@/components/ui/AnimatedCard';
import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { IngredientTags } from '@/components/ui/IngredientTags';
import { Input } from '@/components/ui/Input';
import { NutritionCard } from '@/components/ui/NutritionCard';
import { ThumbnailImage } from '@/components/ui/OptimizedImage';
import { ParallaxImage } from '@/components/ui/ParallaxImage';
import { bgPrimary, Colors, neonGreen, primaryGreen, createColoredGlass } from '@/constants/Colors';
import { Shadows } from '@/constants/Layout';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useNutritionGoals } from '@/hooks/useNutritionGoals';
import { analyzeMealMulti, deleteMeal, getMealById, getMealItems, setMealHeroItem, transcribeAudioDirect, updateMeal } from '@/lib/supabase';
import { getMealTag } from '@/lib/nutritionTags';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    sugar?: number;
    sodium?: number;
    cholesterol?: number;
  };
  health_score?: 'very_healthy' | 'healthy' | 'needs_improvement';
  qualitative_feedback?: string;
  created_at: string;
  ai_analysis?: any;
  nutrition_confidence?: number;
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
  context_text?: string | null;
  items_count?: number;
  meal_type?: string;
}

const { width } = Dimensions.get('window');

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const headerHeight = 44 + insets.top;
  const { activeGoal } = useNutritionGoals();
  const { isPro, canScan, showPaywall, ensureSubscriptionSynced } = useFeatureAccess();
  
  const [meal, setMeal] = useState<Meal | null>(null);
  const [mealItems, setMealItems] = useState<Array<{
    id: string;
    meal_id: string;
    item_type: 'photo' | 'text';
    image_url: string | null;
    text: string | null;
    quantity: number;
    order_index: number;
    is_hero: boolean;
    ai_nutrition_per_unit?: {
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      fiber?: number;
    } | null;
    ai_ingredients?: string[] | null;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [showReanalyzeModal, setShowReanalyzeModal] = useState(false);
  const [tempContextText, setTempContextText] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showEditMetaModal, setShowEditMetaModal] = useState(false);
  const [editedMealType, setEditedMealType] = useState('');
  const [editedCreatedAt, setEditedCreatedAt] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);

  const mealTag = getMealTag(meal ? {
    calories: meal.calories || 0,
    protein: meal.macros?.protein || 0,
    carbs: meal.macros?.carbs || 0,
    fat: meal.macros?.fat || 0
  } : null);

  // Helper to format macro values to 1 decimal point max, removing trailing .0
  const formatMacro = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '0';
    return Number(val.toFixed(1)).toString();
  };

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleAudioTranscription = async (audioUri: string) => {
    if (!meal || !audioUri) return;
    setIsTranscribing(true);
    try {
      const { data, error } = await transcribeAudioDirect(audioUri, meal.user_id);
      if (error) throw error;
      if (data?.transcript) {
        setTempContextText((prev) => {
          const trimmed = prev.trim();
          return trimmed ? `${trimmed} ${data.transcript}` : data.transcript;
        });
      }
    } catch (e) {
      Alert.alert('Transcription Error', 'Failed to transcribe audio. Please try again or type your feedback.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const { isRecording, startRecording, stopRecording } = useAudioRecorder({
    onRecordingComplete: handleAudioTranscription,
    onError: (error) => {
      Alert.alert('Recording Error', error.message);
    },
  });

  const handleVoiceInput = async () => {
    if (isRecording) {
      await stopRecording();
      return;
    }
    try {
      await startRecording();
    } catch {
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
    }
  };

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

      const { data: itemsData, error: itemsError } = await getMealItems(id);
      if (itemsError) {
        console.error('Error loading meal items:', itemsError);
      }
      setMealItems(
        (itemsData || []).map((it) => ({
          id: it.id,
          meal_id: it.meal_id,
          item_type: it.item_type,
          image_url: it.image_url,
          text: it.text,
          quantity: it.quantity,
          order_index: it.order_index,
          is_hero: it.is_hero,
          ai_nutrition_per_unit: it.ai_nutrition_per_unit,
          ai_ingredients: it.ai_ingredients,
        }))
      );
    } catch (error) {
      console.error('Error loading meal:', error);
      Alert.alert('Error', 'Failed to load meal details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSetHero = async (mealItemId: string, imageUrl: string | null) => {
    if (!meal) return;
    try {
      const { error } = await setMealHeroItem(meal.id, mealItemId);
      if (error) {
        throw error;
      }
      setMealItems((prev) => prev.map((i) => (i.item_type === 'photo' ? { ...i, is_hero: i.id === mealItemId } : i)));
      if (imageUrl) {
        setMeal((prev) => (prev ? { ...prev, image_url: imageUrl } : prev));
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to set hero image');
    }
  };

  const openReanalyze = () => {
    setTempContextText(meal?.context_text ?? '');
    setShowReanalyzeModal(true);
  };

  const openEditMeta = () => {
    if (!meal) return;
    setEditedMealType(meal.meal_type || getMealType(meal.created_at));
    setEditedCreatedAt(meal.created_at);
    setShowEditMetaModal(true);
  };

  const handleUpdateMeta = async () => {
    if (!meal) return;
    setSavingMeta(true);
    try {
      console.log('🔄 Updating meal meta:', { 
        id: meal.id, 
        meal_type: editedMealType, 
        created_at: editedCreatedAt 
      });

      const { error } = await updateMeal(meal.id, {
        meal_type: editedMealType,
        created_at: editedCreatedAt,
      });
      
      if (error) {
        console.error('❌ Failed to update meal meta:', error);
        throw error;
      }
      
      // Update local state
      setMeal({
        ...meal,
        meal_type: editedMealType,
        created_at: editedCreatedAt,
      });
      setShowEditMetaModal(false);
    } catch (e: any) {
      console.error('❌ handleUpdateMeta error:', e);
      Alert.alert('Error', `Failed to update meal info: ${e.message || 'Unknown error'}`);
    } finally {
      setSavingMeta(false);
    }
  };

  const adjustDate = (type: 'hour' | 'day', amount: number) => {
    const date = new Date(editedCreatedAt);
    if (type === 'hour') {
      date.setHours(date.getHours() + amount);
    } else if (type === 'day') {
      date.setDate(date.getDate() + amount);
    }
    setEditedCreatedAt(date.toISOString());
  };

  const handleReanalyze = async () => {
    if (!meal) return;
    
    // Close modal immediately and show high-quality loading overlay
    setShowReanalyzeModal(false);
    setAnalysisStatus('analyzing');
    
    try {
      // CRITICAL: Ensure subscription tier is synced to database BEFORE re-analysis.
      // This fixes a race condition where the user upgrades to Pro but the backend
      // reads stale 'free' status, resulting in missing fiber/sugar/sodium/cholesterol.
      await ensureSubscriptionSynced();

      const itemsPayload = mealItems.map((it, idx) => ({
        itemType: it.item_type,
        imageUrl: it.item_type === 'photo' ? it.image_url ?? undefined : undefined,
        text: it.item_type === 'text' ? it.text ?? '' : undefined,
        quantity: it.quantity,
        orderIndex: idx,
        isHero: it.item_type === 'photo' ? it.is_hero : false,
      }));

      const payload = {
        userId: meal.user_id,
        mealId: meal.id,
        contextText: tempContextText.trim() ? tempContextText.trim() : undefined,
        items: itemsPayload,
        isPro,
      };

      const { error } = await analyzeMealMulti(payload);
      if (error) throw error;

      // Show success state briefly
      setAnalysisStatus('success');
      
      // Delay to show success animation before refreshing
      setTimeout(async () => {
        await loadMealDetail();
        setAnalysisStatus('idle');
      }, 1500);
    } catch (e) {
      setAnalysisStatus('idle');
      Alert.alert('Error', 'Failed to reanalyze meal. Please try again.');
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
    if (meal?.meal_type) return meal.meal_type;
    
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

  // Generate summarized meal title from items or use AI description
  const getMealTitle = (): string => {
    // 1. Prioritize the AI-generated description if it's available and not a generic placeholder
    const isGeneric = !meal?.description || 
                     meal.description === 'Meal' || 
                     meal.description === 'Analyzed meal' ||
                     meal.description === 'Analyzed Snack' ||
                     meal.description.includes('item)') ||
                     meal.description.includes('items)');
    
    // Improved fallback for when analysis is still in progress
    if (meal?.processing_status === 'processing' && isGeneric) {
      const mealType = getMealType(meal.created_at || new Date().toISOString());
      return `Analyzing ${mealType}...`;
    }

    if (meal?.description && !isGeneric) {
      return meal.description;
    }

    // 2. Try to use the first item name from AI analysis if it exists but description is still generic
    if (meal?.ai_analysis?.items && Array.isArray(meal.ai_analysis.items) && meal.ai_analysis.items.length > 0) {
      const firstItem = meal.ai_analysis.items[0];
      if (firstItem?.name && firstItem.name !== 'Item 1' && firstItem.name !== 'Food item') {
        const base = firstItem.name;
        if (mealItems.length === 1) return base;
        return `${base} and ${mealItems.length - 1} more`;
      }
    }

    // 3. Fallback to text items
    const textItems = mealItems.filter((i) => i.item_type === 'text' && i.text);
    if (textItems.length > 0) {
      const base = textItems[0]!.text!.trim();
      if (mealItems.length === 1) return base;
      return `${base} + ${mealItems.length - 1} more`;
    }

    // 4. Construct from ingredients if AI analysis failed but identified some ingredients
    if (meal?.ingredients && meal.ingredients.length > 0) {
      const firstIng = meal.ingredients[0];
      return `${firstIng.charAt(0).toUpperCase() + firstIng.slice(1)} Dish`;
    }

    // 5. Final fallback using meal type and item count
    const mealType = getMealType(meal?.created_at || new Date().toISOString());
    if (mealItems.length > 0) {
      return `${mealType} (${mealItems.length} item${mealItems.length > 1 ? 's' : ''})`;
    }
    
    return meal?.description || 'Meal';
  };

  // Get item display name from AI analysis or generate from data
  const getItemDisplayName = (item: typeof mealItems[0], index: number): string => {
    // Check if AI analysis has item names
    if (meal?.ai_analysis?.items && Array.isArray(meal.ai_analysis.items)) {
      const aiItem = meal.ai_analysis.items.find((it: any) => it.index === index);
      if (aiItem?.name) {
        return aiItem.name;
      }
    }

    // Fallback to text or generic name
    if (item.item_type === 'text' && item.text) {
      const trimmed = item.text.trim();
      // Take first 30 chars or first sentence
      const firstSentence = trimmed.split(/[.!?]/)[0];
      return firstSentence.length > 30 ? firstSentence.substring(0, 30) + '...' : firstSentence;
    }

    return `Item ${index + 1}`;
  };

  if (loading) {
    return (
      <PageContainer noPadding edges={['bottom', 'left', 'right']}>
        {/* Skeleton Header */}
        <BlurView 
          intensity={Platform.OS === 'ios' ? 60 : 80} 
          tint="dark" 
          style={[
            styles.floatingHeader, 
            { 
              height: headerHeight, 
              paddingTop: insets.top,
              backgroundColor: createColoredGlass(bgPrimary, 0.75)
            }
          ]}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerButton}>
              <View style={[styles.skeletonCircle, { width: 32, height: 32, backgroundColor: colors.border, opacity: 0.3 }]} />
            </View>
            <View style={styles.headerActions}>
              <View style={styles.headerButton}>
                <View style={[styles.skeletonCircle, { width: 32, height: 32, backgroundColor: colors.border, opacity: 0.3 }]} />
              </View>
              <View style={styles.headerButton}>
                <View style={[styles.skeletonCircle, { width: 32, height: 32, backgroundColor: colors.border, opacity: 0.3 }]} />
              </View>
            </View>
          </View>
        </BlurView>

        <ContentContainer>
          <View style={{ paddingTop: 24 }}>
            {/* Skeleton Hero Image */}
            <View style={[styles.skeletonImage, { height: 380, backgroundColor: colors.border, opacity: 0.3 }]} />

          {/* Skeleton Title Card */}
          <AnimatedCard delay={0} style={styles.titleCard}>
            <View style={styles.titleHeader}>
              <View style={[styles.skeletonText, { width: '70%', height: 32, backgroundColor: colors.border, opacity: 0.3, borderRadius: 8 }]} />
              <View style={[styles.skeletonBadge, { width: 120, height: 28, backgroundColor: colors.border, opacity: 0.3, borderRadius: 16 }]} />
            </View>
            <View style={styles.metaContainer}>
              <View style={[styles.skeletonBadge, { width: 80, height: 24, backgroundColor: colors.border, opacity: 0.3, borderRadius: 16 }]} />
              <View style={[styles.skeletonText, { width: 150, height: 16, backgroundColor: colors.border, opacity: 0.3, borderRadius: 4 }]} />
            </View>
          </AnimatedCard>

          {/* Skeleton Nutrition Card */}
          <AnimatedCard delay={0}>
            <View style={styles.sectionHeader}>
              <View style={[styles.skeletonIcon, { width: 24, height: 24, backgroundColor: colors.border, opacity: 0.3, borderRadius: 4 }]} />
              <View style={[styles.skeletonText, { width: 150, height: 20, backgroundColor: colors.border, opacity: 0.3, borderRadius: 4 }]} />
            </View>
            <View style={[styles.skeletonCard, { height: 120, backgroundColor: colors.border, opacity: 0.3, borderRadius: 12, marginBottom: Spacing.lg }]} />
            <View style={styles.macrosGrid}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={styles.macroCardWrapper}>
                  <View style={[styles.skeletonCard, { height: 100, backgroundColor: colors.border, opacity: 0.3, borderRadius: 12 }]} />
                </View>
              ))}
            </View>
          </AnimatedCard>
        </View>
      </ContentContainer>
    </PageContainer>
  );
}

  if (!meal) {
    return (
      <PageContainer>
        <ContentContainer scrollable={false}>
          <View style={styles.errorContainer}>
            <IconSymbol name="exclamationmark.triangle" size={32} color={colors.icon} />
            <Text style={[TextStyles.body, { color: colors.icon }]}>
              Meal not found
            </Text>
          </View>
        </ContentContainer>
      </PageContainer>
    );
  }

  // Check if this is a database-sourced meal (not AI-analyzed)
  const isDatabaseMeal = meal.ai_analysis?.source_type === 'database';
  const databaseSource = meal.ai_analysis?.database_source as 'usda' | 'off' | undefined;

  // Calculate daily percentages based on active nutrition goal (fallback to defaults)
  const dailyCalories = activeGoal?.dailyTargets.calories ?? 2000;
  const dailyProtein = activeGoal?.dailyTargets.proteinGrams ?? 150;
  const dailyFat = activeGoal?.dailyTargets.fatGrams ?? 65;
  const dailyCarbs = activeGoal?.dailyTargets.carbGrams ?? 250;

  const calorieProgress = meal.calories ? Math.min(meal.calories / dailyCalories, 1) : 0;
  const proteinProgress = meal.macros?.protein ? Math.min(meal.macros.protein / dailyProtein, 1) : 0;
  const fatProgress = meal.macros?.fat ? Math.min(meal.macros.fat / dailyFat, 1) : 0;
  const carbsProgress = meal.macros?.carbs ? Math.min(meal.macros.carbs / dailyCarbs, 1) : 0;

  // Only show the micronutrients section if the meal actually has meaningful data.
  // Meals analyzed in free mode have 0 or missing values for fiber/sugar/sodium/cholesterol.
  // We only show this section if at least one micronutrient is > 0, indicating the meal
  // was analyzed with Pro features enabled at the time of analysis.
  const hasMicronutrientData = !!meal.macros && (
    (meal.macros.fiber ?? 0) > 0 ||
    (meal.macros.sugar ?? 0) > 0 ||
    (meal.macros.sodium ?? 0) > 0 ||
    (meal.macros.cholesterol ?? 0) > 0
  );

  return (
    <PageContainer noPadding edges={['bottom', 'left', 'right']}>
      {/* Translucent Header Overlay */}
      <BlurView 
        intensity={Platform.OS === 'ios' ? 60 : 80} 
        tint="dark" 
        style={[
          styles.floatingHeader, 
          { 
            height: headerHeight, 
            paddingTop: insets.top,
            backgroundColor: createColoredGlass(bgPrimary, 0.75)
          }
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityLabel="Back"
          >
            <IconSymbol name="chevron.left" size={24} color={neonGreen} weight="semibold" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            {/* Center area left empty for minimalist look */}
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={openEditMeta}
              activeOpacity={0.7}
              accessibilityLabel="Edit meal details"
            >
              <IconSymbol name="pencil" size={20} color={neonGreen} weight="semibold" />
            </TouchableOpacity>

            {!isDatabaseMeal && (
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={openReanalyze}
                activeOpacity={0.7}
                accessibilityLabel="Reanalyze meal"
              >
                <IconSymbol name="arrow.clockwise" size={20} color={neonGreen} weight="semibold" />
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleDelete}
              activeOpacity={0.7}
              accessibilityLabel="Delete meal"
            >
              <IconSymbol name="trash" size={20} color={neonGreen} weight="semibold" />
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>

      <ContentContainer>
        {/* Wrap content in a View to handle dynamic padding based on image presence */}
        <View style={{ paddingTop: meal.image_url ? 24 : headerHeight + 12 }}>
          {/* Hero Image with Parallax */}
          {meal.image_url && (
            <ParallaxImage source={{ uri: meal.image_url }} height={380} />
          )}

          {/* Items carousel - Only show if there are multiple photos to switch between */}
          {mealItems.filter((i) => i.item_type === 'photo').length > 1 && (
            <View style={styles.itemsCarousel}>
              <FlatList
                data={mealItems}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.itemsCarouselContent}
                renderItem={({ item }) => {
                  const isPhoto = item.item_type === 'photo';
                  return (
                    <TouchableOpacity
                      style={styles.carouselItem}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (isPhoto) {
                          void handleSetHero(item.id, item.image_url);
                        }
                      }}
                      disabled={!isPhoto}
                    >
                      {isPhoto && item.image_url ? (
                        <View style={styles.carouselPhotoWrapper}>
                          <ThumbnailImage source={{ uri: item.image_url }} style={styles.carouselPhoto} />
                          <View style={styles.carouselBadges}>
                            <View />
                            {item.is_hero && (
                              <View style={styles.heroBadge}>
                                <IconSymbol name="star.fill" size={14} color="#000000" />
                              </View>
                            )}
                          </View>
                        </View>
                      ) : (
                        <View style={styles.carouselTextCard}>
                          <View style={styles.carouselTextHeader}>
                            <IconSymbol name="text.alignleft" size={18} color={neonGreen} />
                          </View>
                          <Text style={styles.carouselText} numberOfLines={3}>
                            {item.text || 'Text item'}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}

          {/* Title Card - Elevated */}
          <AnimatedCard 
            delay={100} 
            style={[
              styles.titleCard,
              !meal.image_url && { marginTop: 0 }
            ]}
          >
          {/* Database Source Badge - show for database-sourced meals */}
          {isDatabaseMeal && databaseSource && (
            <View style={styles.databaseSourceRow}>
              <View style={[styles.databaseSourceBadge, { backgroundColor: databaseSource === 'usda' ? primaryGreen : neonGreen }]}>
                <IconSymbol 
                  name={databaseSource === 'usda' ? 'leaf.fill' : 'barcode'} 
                  size={14} 
                  color="#000000" 
                />
                <Text style={[TextStyles.caption, { color: '#000000', fontWeight: '700' }]}>
                  {databaseSource === 'usda' ? 'USDA Verified' : 'Open Food Facts'}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.titleHeader}>
            <Text style={[TextStyles.h3, { color: colors.text, flex: 1 }]}>
              {getMealTitle()}
            </Text>
            {/* Show health score for AI meals, or "Quick Logged" badge for database meals */}
            {isDatabaseMeal ? (
              <View style={[styles.healthBadge, { backgroundColor: '#3B82F6' }]}>
                <IconSymbol name="bolt.fill" size={14} color="white" />
                <Text style={[TextStyles.bodySmall, { color: 'white', fontWeight: '600' }]}>
                  Quick Logged
                </Text>
              </View>
            ) : (
              <View style={[styles.healthBadge, { backgroundColor: mealTag.color }]}>
                <IconSymbol name={mealTag.icon as any} size={16} color="white" />
                <Text style={[TextStyles.bodySmall, { color: 'white', fontWeight: '600' }]}>
                  {mealTag.label}
                </Text>
              </View>
            )}
          </View>

          {/* Only show AI description for non-database meals */}
          {!isDatabaseMeal && (!!meal.ai_analysis?.description || !!meal.ai_analysis?.feedback || meal.processing_status === 'processing') && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionText}>
                {meal.ai_analysis?.description || 
                 meal.ai_analysis?.feedback || 
                 (meal.processing_status === 'processing' ? 'AI is currently analyzing your meal details...' : 'Analysis completed but no description provided.')}
              </Text>
            </View>
          )}
          
          <View style={styles.metaContainer}>
            <View style={[styles.mealTypeBadge, { backgroundColor: neonGreen, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
              <IconSymbol 
                name={getMealType(meal.created_at) === 'Pill' ? 'pill' : 'fork.knife'} 
                size={14} 
                color="#000000" 
              />
              <Text style={[TextStyles.bodySmall, { color: '#000000', fontWeight: '600' }]}>
                {getMealType(meal.created_at)}
              </Text>
            </View>
            
            <View style={styles.dateTimeRow}>
              <IconSymbol name="calendar" size={16} color={colors.icon} />
              <Text style={[TextStyles.bodySmall, { color: colors.icon, marginLeft: Spacing.xs }]}>
                {formatDate(meal.created_at)} • {formatTime(meal.created_at)}
              </Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Nutrition Overview - Enhanced Cards */}
        {!!meal.calories && (
          <AnimatedCard delay={200}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="chart.bar" size={24} color={colors.tint} />
              <View style={{ flex: 1 }}>
                <Text style={[TextStyles.h4, { color: colors.text }]}>Nutrition Overview</Text>
                {activeGoal && (
                  <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
                    Based on your {activeGoal.name.toLowerCase()} goal of {formatMacro(activeGoal.dailyTargets.calories)} kcal / day
                  </Text>
                )}
              </View>
            </View>
            
            {/* Calories Hero Card */}
            <View style={styles.caloriesHero}>
              <NutritionCard
                value={meal.calories}
                label="Calories"
                unit="cal"
                size="large"
                progressText={calorieProgress > 0 ? `${Math.round(calorieProgress * 100)}% of daily goal` : undefined}
                delay={100}
                style={styles.caloriesCard}
                microArcs={meal.macros ? [
                  { label: 'Protein', value: meal.macros.protein || 0, color: '#38bdf8' },
                  { label: 'Fat', value: meal.macros.fat || 0, color: '#fb7185' },
                  { label: 'Carbs', value: meal.macros.carbs || 0, color: '#fde047' },
                ].filter(arc => arc.value > 0) : []}
              />
            </View>

            {/* Macros Grid - 3-column layout */}
            {!!meal.macros && (
              <View style={styles.macrosGrid}>
                <View style={styles.macroCardWrapper3}>
                  <NutritionCard
                    value={meal.macros.protein || 0}
                    label="Protein"
                    unit="g"
                    delay={200}
                    style={styles.macroCard}
                  />
                </View>
                <View style={styles.macroCardWrapper3}>
                  <NutritionCard
                    value={meal.macros.fat || 0}
                    label="Fat"
                    unit="g"
                    delay={280}
                    style={styles.macroCard}
                  />
                </View>
                <View style={styles.macroCardWrapper3}>
                  <NutritionCard
                    value={meal.macros.carbs || 0}
                    label="Carbs"
                    unit="g"
                    delay={360}
                    style={styles.macroCard}
                  />
                </View>
              </View>
            )}

            {/* Micronutrients Section (Pro Only) */}
            {isPro && hasMicronutrientData && !!meal.macros && (
              <View style={styles.microsSection}>
                <Text style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: Spacing.sm, fontWeight: '600' }]}>
                  Micronutrients
                </Text>
                <View style={styles.macrosGrid}>
                  <View style={styles.macroCardWrapper4}>
                    <NutritionCard
                      value={meal.macros.fiber || 0}
                      label="Fiber"
                      unit="g"
                      size="small"
                      delay={440}
                      style={styles.macroCard}
                    />
                  </View>
                  <View style={styles.macroCardWrapper4}>
                    <NutritionCard
                      value={meal.macros.sugar || 0}
                      label="Sugar"
                      unit="g"
                      size="small"
                      delay={500}
                      style={styles.macroCard}
                    />
                  </View>
                  <View style={styles.macroCardWrapper4}>
                    <NutritionCard
                      value={meal.macros.sodium !== undefined 
                        ? (meal.macros.sodium >= 1000 ? (meal.macros.sodium / 1000).toFixed(1) : meal.macros.sodium) 
                        : 0}
                      label="Sodium"
                      unit={meal.macros.sodium && meal.macros.sodium >= 1000 ? "g" : "mg"}
                      size="small"
                      delay={560}
                      style={styles.macroCard}
                    />
                  </View>
                  <View style={styles.macroCardWrapper4}>
                    <NutritionCard
                      value={meal.macros.cholesterol || 0}
                      label="Cholesterol"
                      unit="mg"
                      size="small"
                      delay={620}
                      style={styles.macroCard}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Item Breakdown - Show when multiple items */}
            {mealItems.length > 1 && (
              <View style={styles.itemsBreakdown}>
                <View style={styles.sectionHeader}>
                  <IconSymbol name="square.grid.2x2" size={20} color={colors.tint} />
                  <Text style={[TextStyles.bodyLarge, { color: colors.text, fontWeight: '600' }]}>
                    Items ({mealItems.length})
                  </Text>
                </View>
                <View style={styles.itemsChipsContainer}>
                  {mealItems.map((item, index) => {
                    const displayName = getItemDisplayName(item, index);
                    const nutrition = item.ai_nutrition_per_unit;
                    const totalCalories = nutrition?.calories ? nutrition.calories * item.quantity : null;
                    
                    return (
                      <View key={item.id} style={styles.itemChip}>
                        <View style={styles.itemChipHeader}>
                          <View style={styles.itemChipNameRow}>
                            {item.item_type === 'photo' ? (
                              <IconSymbol name="photo" size={14} color={neonGreen} />
                            ) : (
                              <IconSymbol name="text.alignleft" size={14} color={neonGreen} />
                            )}
                            <Text style={[TextStyles.bodySmall, { color: colors.text, fontWeight: '600', flex: 1 }]} numberOfLines={1}>
                              {displayName}
                            </Text>
                          </View>
                          <View style={styles.itemChipQuantity}>
                            <Text style={[TextStyles.caption, { color: '#000000', fontWeight: '700' }]}>
                              ×{item.quantity}
                            </Text>
                          </View>
                        </View>
                        {totalCalories !== null && (
                          <View style={styles.itemChipNutrition}>
                            <Text style={[TextStyles.caption, { color: colors.icon }]}>
                              {formatMacro(totalCalories)} cal
                              {!!nutrition?.protein && ` • ${formatMacro(nutrition.protein * item.quantity)}g P`}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </AnimatedCard>
        )}

        {/* Pro Features: Health Assessment & Recommendations */}
        {!isDatabaseMeal && (
          isPro ? (
            <>
              {/* Health Assessment - Quote Style */}
              {meal.qualitative_feedback && (
                <AnimatedCard delay={450} style={styles.quoteCard}>
                  <View style={styles.quoteHeader}>
                    <IconSymbol name="brain.head.profile" size={24} color={colors.tint} />
                    <Text style={[TextStyles.h4, { color: colors.text }]}>
                      Health Assessment
                    </Text>
                  </View>
                  <View style={styles.quoteContent}>
                    <IconSymbol name="quote.opening" size={20} color={colors.tint} style={styles.quoteIcon} />
                    <Text style={[TextStyles.body, { color: colors.text, lineHeight: 24, fontStyle: 'italic' }]}>
                      {meal.qualitative_feedback}
                    </Text>
                  </View>
                </AnimatedCard>
              )}

              {/* Recommendations */}
              {meal.ai_analysis?.recommendations && meal.ai_analysis.recommendations.length > 0 && (
                <AnimatedCard delay={600}>
                  <View style={styles.sectionHeader}>
                    <IconSymbol name="lightbulb" size={24} color={colors.tint} />
                    <Text style={[TextStyles.h4, { color: colors.text }]}>
                      Recommendations
                    </Text>
                  </View>
                  
                  <View style={styles.recommendationsList}>
                    {meal.ai_analysis.recommendations.map((rec: any, index: number) => (
                      <View 
                        key={index} 
                        style={[
                          styles.recommendationItem, 
                          { 
                            backgroundColor: colors.background,
                            borderLeftWidth: 3,
                            borderLeftColor: rec.priority === 3 ? '#EF4444' : 
                                            rec.priority === 2 ? '#F59E0B' : '#10B981',
                          }
                        ]}
                      >
                        <View style={styles.recommendationHeader}>
                          <View style={[
                            styles.priorityBadge, 
                            { 
                              backgroundColor: rec.priority === 3 ? '#EF4444' : 
                                              rec.priority === 2 ? '#F59E0B' : '#10B981' 
                            }
                          ]}>
                            <Text style={[TextStyles.caption, { color: 'white', fontWeight: '600' }]}>
                              {rec.priority === 3 ? 'High' : rec.priority === 2 ? 'Med' : 'Low'}
                            </Text>
                          </View>
                          <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
                            {rec.type?.charAt(0).toUpperCase() + rec.type?.slice(1) || 'General'}
                          </Text>
                        </View>
                        <Text style={[TextStyles.body, { color: colors.text, marginTop: Spacing.sm }]}>
                          {rec.content}
                        </Text>
                      </View>
                    ))}
                  </View>
                </AnimatedCard>
              )}
            </>
          ) : (
            <UpgradePrompt 
              feature="nutrition" 
              title="Unlock Health Insights"
              message="Upgrade to Pro for a qualitative health assessment and personalized recommendations for your meal."
              style={{ marginBottom: PageSpacing.sectionGap }}
            />
          )
        )}

        {/* Ingredients - Tag Style */}
        {meal.ingredients && meal.ingredients.length > 0 && (
          <AnimatedCard delay={500}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="list.bullet" size={24} color={colors.tint} />
              <Text style={[TextStyles.h4, { color: colors.text }]}>
                Ingredients
              </Text>
            </View>
            <IngredientTags ingredients={meal.ingredients} maxVisible={8} />
          </AnimatedCard>
        )}

        {/* Serving Size */}
        {meal.serving_estimate && (
          <AnimatedCard delay={550}>
            <View style={styles.sectionHeader}>
              <IconSymbol name="scalemass" size={24} color={colors.tint} />
              <Text style={[TextStyles.h4, { color: colors.text }]}>
                Serving Size
              </Text>
            </View>
            <Text style={[TextStyles.body, { color: colors.text }]}>
              {meal.serving_estimate}
            </Text>
          </AnimatedCard>
        )}

        {/* Processing Status */}
        {meal.processing_status && meal.processing_status !== 'completed' && (
          <AnimatedCard delay={650}>
            <View style={styles.sectionHeader}>
              <IconSymbol 
                name={meal.processing_status === 'processing' ? 'hourglass' : 
                     meal.processing_status === 'failed' ? 'exclamationmark.triangle' : 'checkmark.circle'} 
                size={24} 
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
          </AnimatedCard>
        )}
      </View>
    </ContentContainer>

      {/* Reanalyze Modal */}
      <Modal
        visible={showReanalyzeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReanalyzeModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContainer}
            >
              <View style={styles.modalCard}>
                <View style={styles.modalHeaderRow}>
                  <Text style={[TextStyles.h3, { color: colors.text }]}>Reanalyze</Text>
                  <TouchableOpacity
                    onPress={() => setShowReanalyzeModal(false)}
                    style={styles.modalCloseButton}
                    activeOpacity={0.8}
                  >
                    <IconSymbol name="xmark" size={22} color={colors.icon} />
                  </TouchableOpacity>
                </View>

                <Text style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: Spacing.md }]}>
                  Add or update context for the full meal, then re-run analysis. Type or use voice input.
                </Text>

                <Input
                  placeholder="E.g., large portions, sugar-free drink, extra sauce…"
                  value={tempContextText}
                  onChangeText={setTempContextText}
                  multiline
                  numberOfLines={7}
                  textAlignVertical="top"
                  rightIcon={
                    !isKeyboardVisible && (
                      <TouchableOpacity
                        onPress={handleVoiceInput}
                        disabled={isTranscribing}
                        activeOpacity={0.7}
                        style={styles.voiceInputButton}
                      >
                        <IconSymbol
                          name={isRecording ? 'stop.fill' : isTranscribing ? 'hourglass' : 'mic'}
                          size={26}
                          color={isRecording ? '#EF4444' : neonGreen}
                        />
                      </TouchableOpacity>
                    )
                  }
                  containerStyle={{ marginBottom: Spacing.lg }}
                  style={{ minHeight: 140 }}
                />

                {/* Recording indicator */}
                {isRecording && (
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={[TextStyles.bodySmall, { color: '#EF4444' }]}>Recording… tap mic to stop</Text>
                  </View>
                )}

                {/* Transcribing indicator */}
                {isTranscribing && (
                  <View style={styles.transcribingIndicator}>
                    <ActivityIndicator size="small" color={neonGreen} />
                    <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>Transcribing…</Text>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <Button variant="secondary" onPress={() => setShowReanalyzeModal(false)} style={styles.modalActionBtn}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onPress={handleReanalyze}
                    style={styles.modalActionBtn}
                  >
                    Reanalyze
                  </Button>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Meta Modal */}
      <Modal
        visible={showEditMetaModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditMetaModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeaderRow}>
                  <Text style={[TextStyles.h3, { color: colors.text }]}>Edit Meal Info</Text>
                  <TouchableOpacity
                    onPress={() => setShowEditMetaModal(false)}
                    style={styles.modalCloseButton}
                    activeOpacity={0.8}
                  >
                    <IconSymbol name="xmark" size={22} color={colors.icon} />
                  </TouchableOpacity>
                </View>

                {/* Meal Type Selection */}
                <Text style={[TextStyles.h4, { color: colors.text, marginBottom: Spacing.sm }]}>Meal Type</Text>
                <View style={styles.mealTypeGrid}>
                  {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.mealTypeOption,
                        editedMealType === type && { backgroundColor: neonGreen, borderColor: neonGreen }
                      ]}
                      onPress={() => setEditedMealType(type)}
                    >
                      <Text style={[
                        TextStyles.bodySmall,
                        { color: editedMealType === type ? '#000000' : colors.text, fontWeight: '600' }
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Date/Time Adjustment */}
                <Text style={[TextStyles.h4, { color: colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm }]}>
                  Date & Time
                </Text>
                <View style={styles.dateDisplayCard}>
                  <Text style={[TextStyles.body, { color: colors.text, textAlign: 'center' }]}>
                    {formatDate(editedCreatedAt)}
                  </Text>
                  <Text style={[TextStyles.h2, { color: neonGreen, textAlign: 'center', marginTop: Spacing.xs }]}>
                    {formatTime(editedCreatedAt)}
                  </Text>
                </View>

                <View style={styles.adjustmentGrid}>
                  <View style={styles.adjustmentColumn}>
                    <Text style={[TextStyles.caption, { color: colors.icon, textAlign: 'center' }]}>Hours</Text>
                    <View style={styles.adjustmentButtons}>
                      <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustDate('hour', -1)}>
                        <IconSymbol name="minus" size={16} color={colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustDate('hour', 1)}>
                        <IconSymbol name="plus" size={16} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.adjustmentColumn}>
                    <Text style={[TextStyles.caption, { color: colors.icon, textAlign: 'center' }]}>Days</Text>
                    <View style={styles.adjustmentButtons}>
                      <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustDate('day', -1)}>
                        <IconSymbol name="minus" size={16} color={colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustDate('day', 1)}>
                        <IconSymbol name="plus" size={16} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={[styles.modalActions, { marginTop: Spacing.xl }]}>
                  <Button variant="secondary" onPress={() => setShowEditMetaModal(false)} style={styles.modalActionBtn}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onPress={handleUpdateMeta}
                    style={styles.modalActionBtn}
                    disabled={savingMeta}
                    icon={savingMeta ? <ActivityIndicator size="small" color="#000000" /> : undefined}
                  >
                    {savingMeta ? 'Saving...' : 'Save Changes'}
                  </Button>
                </View>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <AnalysisLoadingOverlay status={analysisStatus} />
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.base,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.base,
  },
  titleCard: {
    marginTop: -20,
    marginBottom: PageSpacing.sectionGap,
    paddingTop: Spacing.xl,
  },
  databaseSourceRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  databaseSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    gap: Spacing.xs,
  },
  titleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
    gap: Spacing.xs,
    ...Shadows.md,
    alignSelf: 'flex-start',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  mealTypeBadge: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  descriptionContainer: {
    marginTop: -Spacing.xs,
    marginBottom: Spacing.lg,
  },
  descriptionText: {
    ...TextStyles.body,
    color: 'white',
    opacity: 0.9,
    lineHeight: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  caloriesHero: {
    marginBottom: Spacing.md,
  },
  caloriesCard: {
    width: '100%',
  },
  macrosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8, // Fixed small gap for precision
    marginBottom: Spacing.base,
    justifyContent: 'center',
  },
  macroCardWrapper: {
    width: '48%', // Default for 2 columns
    alignItems: 'center',
  },
  macroCardWrapper3: {
    width: '31%', // 3 columns
    aspectRatio: 1, // Force squareness
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroCardWrapper4: {
    width: '23%', // 4 columns
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroCard: {
    width: '100%',
  },
  microsSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  microDivider: {
    marginBottom: Spacing.md,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.base,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  quoteCard: {
    borderLeftWidth: 4,
    borderLeftColor: neonGreen,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  quoteContent: {
    position: 'relative',
    paddingLeft: Spacing.xl,
  },
  quoteIcon: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0.3,
  },
  recommendationsList: {
    gap: Spacing.base,
  },
  recommendationItem: {
    padding: Spacing.lg,
    borderRadius: 12,
    paddingLeft: Spacing.lg + 3,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
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
  skeletonCircle: {
    borderRadius: 999,
  },
  skeletonIcon: {
    borderRadius: 4,
  },
  skeletonCard: {
    borderRadius: 12,
  },

  itemsCarousel: {
    marginTop: Spacing.base,
    marginBottom: PageSpacing.sectionGap,
  },
  itemsCarouselContent: {
    paddingHorizontal: PageSpacing.containerPadding,
    gap: Spacing.md,
  },
  carouselItem: {
    width: 140,
  },
  carouselPhotoWrapper: {
    width: 140,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  carouselPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  carouselBadges: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: neonGreen,
    padding: 6,
    borderRadius: 9999,
  },
  carouselTextCard: {
    width: 140,
    height: 120,
    borderRadius: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'space-between',
  },
  carouselTextHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  carouselText: {
    color: 'white',
    fontSize: 13,
    lineHeight: 18,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 520,
  },
  modalCard: {
    backgroundColor: bgPrimary,
    borderRadius: 20,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalCloseButton: {
    padding: Spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalActionBtn: {
    flex: 1,
  },
  voiceInputButton: {
    padding: Spacing.xs,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: -Spacing.md,
    marginBottom: Spacing.md,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  transcribingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: -Spacing.md,
    marginBottom: Spacing.md,
  },
  itemsBreakdown: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  itemsChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  itemChip: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  itemChipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  itemChipNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  itemChipQuantity: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    borderWidth: 1,
    borderColor: neonGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemChipNutrition: {
    marginTop: Spacing.xs,
  },
  mealTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  mealTypeOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  dateDisplayCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  adjustmentGrid: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.md,
  },
  adjustmentColumn: {
    flex: 1,
    gap: Spacing.xs,
  },
  adjustmentButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  adjustBtn: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 