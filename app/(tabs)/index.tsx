import BottomSheet from '@gorhom/bottom-sheet';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';

import { ContentContainer } from '@/components/layout/ContentContainer';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { StreakCard, StreakHubSheet } from '@/components/streak';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DiscoveryCard } from '@/components/ui/DiscoveryCard';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { NutritionHero } from '@/components/ui/NutritionHero';
import { ProBadge } from '@/components/ui/ProBadge';
import { Colors, neonGreen, primaryGreen } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useCaptureOptional } from '@/context/CaptureContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { calculateCurrentStreak, calculateLongestStreak } from '@/lib/streakUtils';
import { getAllUserMeals, getCurrentUser, supabase } from '@/lib/supabase';
import { computeStreakSummary } from '@/services/streakService';
import type { StreakCardState, StreakSummary } from '@/types/streak';
import { AppleHealthService } from '@/lib/health/AppleHealthService';

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
  fiber_score?: string;
  qualitative_feedback?: string;
  recipe?: string;
  created_at: string;
  ai_analysis?: unknown;
  nutrition_confidence?: number;
  analysis_version?: string;
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed';
}

interface TodayStats {
  mealsCount: number;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbs: number;
}

export default function HomeScreen() {
  const { isPro } = useSubscription();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const capture = useCaptureOptional();

  // Streak Hub sheet ref
  const streakHubRef = useRef<BottomSheet>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  
  // Streak summary state
  const [streakSummary, setStreakSummary] = useState<StreakSummary | null>(null);
  const [previousCardState, setPreviousCardState] = useState<StreakCardState | undefined>(undefined);
  const [userId, setUserId] = useState<string | null>(null);

  const [weeklyCalories, setWeeklyCalories] = useState<number[][]>([
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ]);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>((new Date().getDay() + 6) % 7);
  const [selectedWeekIndex, setSelectedDateWeekIndex] = useState<number>(2); // Default to current week (index 2)
  const [weeklyStats, setWeeklyStats] = useState<TodayStats[][]>([
    Array.from({ length: 7 }, () => ({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 })),
    Array.from({ length: 7 }, () => ({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 })),
    Array.from({ length: 7 }, () => ({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 })),
  ]);
  const [allMeals, setAllMeals] = useState<Meal[]>([]);
  const [healthData, setHealthData] = useState<{ steps: number; activeCalories: number } | undefined>(undefined);

  // Helper to format macro values to 1 decimal point max, removing trailing .0
  const formatMacro = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '0';
    return Number(val.toFixed(1)).toString();
  };

  useEffect(() => {
    loadData();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        loadData();
      } else {
        resetState();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        loadData(false, true);
      }
    }, [loading])
  );

  const resetState = () => {
    setCurrentStreak(0);
    setLongestStreak(0);
    setStreakSummary(null);
    setPreviousCardState(undefined);
    setUserId(null);
    setWeeklyCalories([
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
    ]);
    setWeeklyStats([
      Array.from({ length: 7 }, () => ({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 })),
      Array.from({ length: 7 }, () => ({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 })),
      Array.from({ length: 7 }, () => ({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 })),
    ]);
    setAllMeals([]);
    setHealthData(undefined);
  };

  const loadData = async (isRefreshing = false, silent = false): Promise<void> => {
    try {
      if (isRefreshing) setRefreshing(true);
      else if (!silent) setLoading(true);
      
      const { user } = await getCurrentUser();
      if (!user) {
        resetState();
        return;
      }

      setUserId(user.id);

      // Free users are limited to 7 days of history
      const daysLimit = isPro ? undefined : 7;
      const { data: meals, error } = await getAllUserMeals(user.id, daysLimit);
      if (error || !meals) {
        resetState();
        return;
      }

      setAllMeals(meals);
      setCurrentStreak(calculateCurrentStreak(meals));
      setLongestStreak(calculateLongestStreak(meals));

      // Compute streak summary
      // Save previous state for transition detection
      if (streakSummary) {
        setPreviousCardState(streakSummary.cardState);
      }
      
      // Convert meals to the format needed for streak service
      const mealsForStreak = meals.map(m => ({
        id: m.id,
        created_at: m.created_at,
        health_score: m.health_score,
      }));
      
      const newStreakSummary = await computeStreakSummary(mealsForStreak, user.id);
      setStreakSummary(newStreakSummary);
      
      // Calculate 3-week stats (2 Weeks Ago, Last Week, Current Week)
      const newWeeklyStats = [
        Array.from({ length: 7 }, () => ({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 })),
        Array.from({ length: 7 }, () => ({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 })),
        Array.from({ length: 7 }, () => ({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 })),
      ];

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayOfWeek = today.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      
      const currentMonday = new Date(today);
      currentMonday.setDate(today.getDate() + diffToMonday);
      
      const lastMonday = new Date(currentMonday);
      lastMonday.setDate(currentMonday.getDate() - 7);
      
      const twoWeeksAgoMonday = new Date(currentMonday);
      twoWeeksAgoMonday.setDate(currentMonday.getDate() - 14);
      
      meals.forEach(meal => {
        const mealDate = new Date(meal.created_at);
        const mealDay = new Date(mealDate.getFullYear(), mealDate.getMonth(), mealDate.getDate());
        
        // Current Week
        if (mealDay >= currentMonday) {
          const index = (mealDay.getDay() + 6) % 7;
          if (index >= 0 && index < 7) {
            newWeeklyStats[2][index].mealsCount += 1;
            newWeeklyStats[2][index].totalCalories += meal.calories || 0;
            newWeeklyStats[2][index].totalProtein += meal.macros?.protein || 0;
            newWeeklyStats[2][index].totalFat += meal.macros?.fat || 0;
            newWeeklyStats[2][index].totalCarbs += meal.macros?.carbs || 0;
          }
        }
        // Last Week
        else if (mealDay >= lastMonday && mealDay < currentMonday) {
          const index = (mealDay.getDay() + 6) % 7;
          if (index >= 0 && index < 7) {
            newWeeklyStats[1][index].mealsCount += 1;
            newWeeklyStats[1][index].totalCalories += meal.calories || 0;
            newWeeklyStats[1][index].totalProtein += meal.macros?.protein || 0;
            newWeeklyStats[1][index].totalFat += meal.macros?.fat || 0;
            newWeeklyStats[1][index].totalCarbs += meal.macros?.carbs || 0;
          }
        }
        // 2 Weeks Ago
        else if (mealDay >= twoWeeksAgoMonday && mealDay < lastMonday) {
          const index = (mealDay.getDay() + 6) % 7;
          if (index >= 0 && index < 7) {
            newWeeklyStats[0][index].mealsCount += 1;
            newWeeklyStats[0][index].totalCalories += meal.calories || 0;
            newWeeklyStats[0][index].totalProtein += meal.macros?.protein || 0;
            newWeeklyStats[0][index].totalFat += meal.macros?.fat || 0;
            newWeeklyStats[0][index].totalCarbs += meal.macros?.carbs || 0;
          }
        }
      });

      setWeeklyStats(newWeeklyStats);
      setWeeklyCalories(newWeeklyStats.map(week => week.map(s => s.totalCalories)));

    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    loadData(true);
  }, []);

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
        month: 'short', 
        day: 'numeric'
      });
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryGreen} />
          <Text style={[TextStyles.body, { color: colors.icon, marginTop: Spacing.base }]}>
            Optimizing your dashboard...
          </Text>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader 
        title="Today" 
        rightAction={isPro ? <ProBadge style={{ marginTop: 8 }} /> : null}
      />
      <ContentContainer
        scrollable={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primaryGreen}
          />
        }
      >
        {/* Hero Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(100).easing(Easing.out(Easing.quad))}>
          <Section gap={Spacing.xl}>
            <NutritionHero 
              stats={weeklyStats[selectedWeekIndex][selectedDateIndex]} 
              weeklyCalories={weeklyCalories} 
              selectedDateIndex={selectedDateIndex}
              selectedWeekIndex={selectedWeekIndex}
              onSelectDate={(weekIdx, dateIdx) => {
                setSelectedDateWeekIndex(weekIdx);
                setSelectedDateIndex(dateIdx);
              }}
              currentStreak={currentStreak}
              healthData={healthData}
            />
          </Section>
        </Animated.View>

        {/* Recent Meal Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(200).easing(Easing.out(Easing.quad))}>
          <Section gap={Spacing.xl}>
            <View style={styles.sectionHeader}>
              <Text style={[TextStyles.h4, { color: colors.text }]}>Recent Meal</Text>
              {allMeals.length > 0 && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/journal')}>
                  <Text style={[TextStyles.bodySmall, { color: neonGreen, fontWeight: '600' }]}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {allMeals.length > 0 ? (
              <DiscoveryCard 
                type="meal"
                title={allMeals[0].description}
                subtitle={`${allMeals[0].calories ? formatMacro(allMeals[0].calories) + ' kcal • ' : ''}${formatDate(allMeals[0].created_at)}`}
                imageUrl={allMeals[0].image_url}
                mealId={allMeals[0].id}
              />
            ) : (
              <Card variant="glass" style={styles.emptyRecentMeal}>
                <Text style={[TextStyles.body, { color: colors.icon, textAlign: 'center' }]}>
                  No meals logged yet. Start capturing to see your history!
                </Text>
                <Button 
                  variant="primary" 
                  onPress={() => router.push('/(tabs)/log')}
                  style={{ marginTop: Spacing.md }}
                >
                  Log My First Meal
                </Button>
              </Card>
            )}
          </Section>
        </Animated.View>

        {/* Progress / Streak Card */}
        <Animated.View entering={FadeInDown.duration(600).delay(300).easing(Easing.out(Easing.quad))}>
          <Section gap={Spacing.xl}>
            <View style={styles.sectionHeader}>
              <Text style={[TextStyles.h4, { color: colors.text }]}>Progress</Text>
              <TouchableOpacity onPress={() => streakHubRef.current?.expand()}>
                <View style={styles.viewButton}>
                  <Text style={[TextStyles.bodySmall, { color: neonGreen, fontWeight: '600' }]}>View</Text>
                  <IconSymbol name="chevron.right" size={14} color={neonGreen} />
                </View>
              </TouchableOpacity>
            </View>
            
            {streakSummary ? (
              <StreakCard
                streakSummary={streakSummary}
                onLogNow={() => {
                  // Open capture sheet via context if available
                  if (capture?.openCaptureSheet) {
                    capture.openCaptureSheet();
                  } else {
                    // Fallback to navigation
                    router.push('/(tabs)/log');
                  }
                }}
                onViewStreak={() => streakHubRef.current?.expand()}
                previousCardState={previousCardState}
              />
            ) : (
              <Card variant="glass" style={styles.progressHubCard}>
                <View style={styles.hubHeroSection}>
                  <ActivityIndicator size="small" color={neonGreen} />
                  <Text style={[TextStyles.bodySmall, { color: colors.icon, marginTop: Spacing.sm }]}>
                    Loading streak data...
                  </Text>
                </View>
              </Card>
            )}
          </Section>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ContentContainer>

      {/* Streak Hub Bottom Sheet */}
      <StreakHubSheet
        ref={streakHubRef}
        streakSummary={streakSummary}
        onClose={() => {}}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressHubCard: {
    padding: Spacing.base,
    paddingVertical: Spacing.xl,
    borderRadius: 32,
  },
  hubHeroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyRecentMeal: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
