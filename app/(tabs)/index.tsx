import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown, LinearTransition, Easing } from 'react-native-reanimated';

import { ContentContainer } from '@/components/layout/ContentContainer';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DiscoveryCard } from '@/components/ui/DiscoveryCard';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { NutritionHero } from '@/components/ui/NutritionHero';
import { Tag } from '@/components/ui/Tag';
import { Colors, glassSurface, neonGreen, primaryGreen } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { calculateCurrentStreak, calculateLongestStreak } from '@/lib/streakUtils';
import { getAllUserMeals, getCurrentUser, supabase } from '@/lib/supabase';

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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [weeklyCalories, setWeeklyCalories] = useState<number[][]>([
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ]);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>((new Date().getDay() + 6) % 7);
  const [selectedWeekIndex, setSelectedDateWeekIndex] = useState<number>(2); // Default to current week (index 2)
  const [weeklyStats, setWeeklyStats] = useState<TodayStats[][]>([
    Array(7).fill({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 }),
    Array(7).fill({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 }),
    Array(7).fill({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 }),
  ]);
  const [allMeals, setAllMeals] = useState<Meal[]>([]);

  // Mock data for XP/Level
  const currentLevel = 3;
  const currentXP = 450;
  const nextLevelXP = 600;
  const xpProgress = (currentXP / nextLevelXP) * 100;

  // Mock achievements
  const achievements = [
    { icon: 'flame.fill', title: '7 Day Streak', unlocked: true, color: 'coral' as const },
    { icon: 'star.fill', title: 'Consistency', unlocked: true, color: 'neon' as const },
    { icon: 'leaf.fill', title: 'Healthy Week', unlocked: true, color: 'neon' as const },
  ];

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
    setWeeklyCalories([
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
    ]);
    setWeeklyStats([
      Array(7).fill({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 }),
      Array(7).fill({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 }),
      Array(7).fill({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 }),
    ]);
    setAllMeals([]);
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

      const { data: meals, error } = await getAllUserMeals(user.id);
      if (error || !meals) {
        resetState();
        return;
      }

      setAllMeals(meals);
      setCurrentStreak(calculateCurrentStreak(meals));
      setLongestStreak(calculateLongestStreak(meals));
      
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
      <PageHeader title="Today" />
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
          <Section gap={Spacing.lg}>
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
            />
          </Section>
        </Animated.View>

        {/* Recent Meal Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(200).easing(Easing.out(Easing.quad))}>
          <Section gap={Spacing.md}>
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
                subtitle={`${allMeals[0].calories ? allMeals[0].calories + ' kcal • ' : ''}${formatDate(allMeals[0].created_at)}`}
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

        {/* Progress Hub */}
        <Animated.View entering={FadeInDown.duration(600).delay(300).easing(Easing.out(Easing.quad))}>
          <Section gap={Spacing.md}>
            <View style={styles.sectionHeader}>
              <Text style={[TextStyles.h4, { color: colors.text }]}>Progress</Text>
            </View>
            
            <Card variant="glass" style={styles.progressHubCard}>
              {/* Centered Streak Section */}
              <View style={styles.hubHeroSection}>
                <View style={styles.hubStreakIconContainer}>
                  <View style={styles.iconBacklight} />
                  <IconSymbol name="flame.fill" size={36} color={neonGreen} />
                </View>
                
                <View style={styles.hubStreakTextContainer}>
                  <View style={styles.hubStreakRow}>
                    <Text style={[TextStyles.h1, { color: colors.text, fontSize: 48, lineHeight: 56 }]}>
                      {currentStreak}
                    </Text>
                    <Text style={[TextStyles.h4, { color: colors.text, opacity: 0.9, letterSpacing: 1 }]}>
                      DAY STREAK
                    </Text>
                  </View>
                  <Text style={[TextStyles.bodySmall, { color: colors.icon, marginTop: -4 }]}>
                    {currentStreak > 0 ? "You're on fire! Keep it up." : "Log a meal to start."}
                  </Text>
                </View>

                <View style={styles.hubBestStreakPill}>
                  <IconSymbol name="star.fill" size={10} color={neonGreen} />
                  <Text style={[TextStyles.caption, { color: neonGreen, fontWeight: '700' }]}>
                    BEST: {longestStreak} DAYS
                  </Text>
                </View>
              </View>

              {/* Horizontal Divider */}
              <View style={styles.hubDivider} />

              {/* Achievements Grid inside the Card */}
              <View style={styles.hubBadgesGrid}>
                {achievements.map((achievement, index) => (
                  <Badge
                    key={index}
                    icon={achievement.icon}
                    title={achievement.title}
                    unlocked={achievement.unlocked}
                    accentColor={achievement.color as any}
                  />
                ))}
              </View>
            </Card>
          </Section>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ContentContainer>
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
    marginBottom: 4,
  },
  progressHubCard: {
    padding: Spacing.base,
    paddingVertical: Spacing.xl,
    borderRadius: 32,
  },
  hubHeroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.xl,
  },
  hubStreakIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20, // Squircle
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${neonGreen}10`,
    borderWidth: 1,
    borderColor: `${neonGreen}20`,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  hubStreakTextContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  hubStreakRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  hubBestStreakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  hubDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
    marginBottom: Spacing.xl,
  },
  hubBadgesGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
  },
  iconBacklight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: neonGreen,
    opacity: 0.1,
  },
  xpCard: {
    padding: Spacing.md,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  xpBarTrack: {
    height: 8,
    backgroundColor: glassSurface,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  emptyRecentMeal: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
