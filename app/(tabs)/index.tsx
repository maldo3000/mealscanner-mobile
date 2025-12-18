import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Mascot } from '@/components/Mascot';
import { ContentContainer } from '@/components/layout/ContentContainer';
import { PageContainer } from '@/components/layout/PageContainer';
import { Section } from '@/components/layout/Section';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { PieChart } from '@/components/ui/PieChart';
import { Tag } from '@/components/ui/Tag';
import { accentSky, Colors, glassBorder, glassSurface, neonGreen, primaryGreen } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { calculateCurrentStreak, calculateLongestStreak, getWeeklyMealCounts } from '@/lib/streakUtils';
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
  health_score?: 'healthy' | 'moderately_healthy' | 'unhealthy';
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
  totalCalories: number | null;
  totalProtein: number | null;
  totalFat: number | null;
  totalCarbs: number | null;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [allMeals, setAllMeals] = useState<Meal[]>([]);
  const [chartPeriod, setChartPeriod] = useState<'today' | 'week' | 'all'>('today');
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Mock data for XP/Level (to be connected later)
  const currentLevel = 3;
  const currentXP = 450;
  const nextLevelXP = 600;
  const xpProgress = (currentXP / nextLevelXP) * 100;

  // Mock achievements
  const achievements = [
    { icon: 'flame.fill', title: '7 Day Streak', unlocked: true, color: 'coral' as const },
    { icon: 'star.fill', title: 'Consistency', unlocked: true, color: 'yellow' as const },
    { icon: 'leaf.fill', title: 'Healthy Week', unlocked: true, color: 'green' as const },
    { icon: 'heart.fill', title: 'Diversity', unlocked: false, color: 'lavender' as const },
    { icon: 'trophy.fill', title: 'Champion', unlocked: false, color: 'sky' as const },
    { icon: 'sparkles', title: 'Explorer', unlocked: false, color: 'yellow' as const },
  ];

  useEffect(() => {
    loadStreakData();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          loadStreakData();
        } else {
          setCurrentStreak(0);
          setLongestStreak(0);
          setWeeklyData([0, 0, 0, 0, 0, 0, 0]);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadStreakData = async (isRefreshing = false): Promise<void> => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const { user } = await getCurrentUser();
      
      if (!user) {
        setCurrentStreak(0);
        setLongestStreak(0);
        setWeeklyData([0, 0, 0, 0, 0, 0, 0]);
        setTodayStats(null);
        setAllMeals([]);
        return;
      }

      const { data: meals, error } = await getAllUserMeals(user.id);
      
      if (error) {
        console.error('Error loading meals for streak:', error);
        setTodayStats(null);
        setAllMeals([]);
        return;
      }

      if (!meals || meals.length === 0) {
        setCurrentStreak(0);
        setLongestStreak(0);
        setWeeklyData([0, 0, 0, 0, 0, 0, 0]);
        setTodayStats(null);
        setAllMeals([]);
        return;
      }

      setAllMeals(meals);

      // Calculate streaks
      const streak = calculateCurrentStreak(meals);
      const longest = calculateLongestStreak(meals);
      const weekly = getWeeklyMealCounts(meals);

      setCurrentStreak(streak);
      setLongestStreak(longest);
      setWeeklyData(weekly);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todaysMeals = meals.filter((meal: Meal) => new Date(meal.created_at) >= todayStart);

      if (todaysMeals.length === 0) {
        setTodayStats(null);
      } else {
        let totalCalories: number | null = null;
        let totalProtein: number | null = null;
        let totalFat: number | null = null;
        let totalCarbs: number | null = null;

        todaysMeals.forEach((meal) => {
          if (typeof meal.calories === 'number') {
            totalCalories = (totalCalories ?? 0) + meal.calories;
          }

          if (meal.macros) {
            if (typeof meal.macros.protein === 'number') {
              totalProtein = (totalProtein ?? 0) + meal.macros.protein;
            }
            if (typeof meal.macros.fat === 'number') {
              totalFat = (totalFat ?? 0) + meal.macros.fat;
            }
            if (typeof meal.macros.carbs === 'number') {
              totalCarbs = (totalCarbs ?? 0) + meal.macros.carbs;
            }
          }
        });

        setTodayStats({
          mealsCount: todaysMeals.length,
          totalCalories,
          totalProtein,
          totalFat,
          totalCarbs,
        });
      }
    } catch (error) {
      console.error('Error loading streak data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    loadStreakData(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const formatMacroValue = (value: number | null, unit: string): string => {
    if (typeof value === 'number') {
      return `${Math.round(value)}${unit}`;
    }

    return '--';
  };

  const getFilteredMeals = (period: 'today' | 'week' | 'all'): Meal[] => {
    if (period === 'all') return allMeals;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'today') {
      return allMeals.filter((meal) => new Date(meal.created_at) >= todayStart);
    }

    // week
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return allMeals.filter((meal) => new Date(meal.created_at) >= weekStart);
  };

  const calculateMacroStats = (meals: Meal[]) => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    meals.forEach((meal) => {
      if (typeof meal.calories === 'number') {
        totalCalories += meal.calories;
      }
      if (meal.macros) {
        if (typeof meal.macros.protein === 'number') {
          totalProtein += meal.macros.protein;
        }
        if (typeof meal.macros.carbs === 'number') {
          totalCarbs += meal.macros.carbs;
        }
        if (typeof meal.macros.fat === 'number') {
          totalFat += meal.macros.fat;
        }
      }
    });

    // Convert macros to calories for pie chart (protein/carbs = 4 cal/g, fat = 9 cal/g)
    const proteinCalories = totalProtein * 4;
    const carbsCalories = totalCarbs * 4;
    const fatCalories = totalFat * 9;
    const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;

    return {
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      proteinCalories,
      carbsCalories,
      fatCalories,
      totalMacroCalories,
    };
  };

  const getPieChartData = () => {
    const filteredMeals = getFilteredMeals(chartPeriod);
    const stats = calculateMacroStats(filteredMeals);

    if (stats.totalMacroCalories === 0) {
      return [];
    }

    return [
      {
        label: 'Protein',
        value: stats.proteinCalories,
        color: '#4A90E2', // Blue
      },
      {
        label: 'Carbs',
        value: stats.carbsCalories,
        color: neonGreen, // Green
      },
      {
        label: 'Fat',
        value: stats.fatCalories,
        color: '#F5A623', // Orange/Yellow
      },
    ];
  };

  const getWeeklyCalories = (): number[] => {
    const weeklyCalories = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get Monday of the current week
    const monday = new Date(today);
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(today.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);
    
    // Get Sunday of the current week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    // Calculate calories per day for the current week
    for (const meal of allMeals) {
      const mealDate = new Date(meal.created_at);
      mealDate.setHours(0, 0, 0, 0);
      
      if (mealDate >= monday && mealDate <= sunday && typeof meal.calories === 'number') {
        const mealDayOfWeek = mealDate.getDay();
        const mondayBasedIndex = mealDayOfWeek === 0 ? 6 : mealDayOfWeek - 1;
        weeklyCalories[mondayBasedIndex] += meal.calories;
      }
    }
    
    return weeklyCalories;
  };

  const getWeeklyCalorieColor = (calories: number): string => {
    if (calories === 0) return 'rgba(255, 255, 255, 0.1)';
    if (calories < 1000) return accentSky + '80';
    if (calories < 2000) return neonGreen + '80';
    return neonGreen;
  };

  const getDayColor = (meals: number) => {
    if (meals === 0) return 'rgba(255, 255, 255, 0.1)';
    if (meals === 1) return accentSky + '80';
    if (meals === 2) return neonGreen + '80';
    return neonGreen;
  };

  if (loading) {
    return (
      <PageContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryGreen} />
          <Text style={[TextStyles.body, { color: colors.icon, marginTop: Spacing.base }]}>
            Loading your progress...
          </Text>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ContentContainer
        scrollable={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primaryGreen}
            colors={[primaryGreen]}
          />
        }
      >
        {/* Today Summary */}
        <Section gap={PageSpacing.cardGap}>
          <Card variant="glass">
            <TouchableOpacity
              style={styles.todaySummary}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/journal')}
              accessibilityRole="button"
              accessibilityLabel="View today's meals"
              accessibilityHint="Opens your journal filtered to today"
            >
              <View style={styles.todaySummaryText}>
                <Text style={[TextStyles.h4, { color: colors.text }]}>
                  {todayStats ? "Today's progress" : 'Start tracking today'}
                </Text>
                <Text style={[TextStyles.bodySmall, { color: colors.icon, marginTop: Spacing.xs }]}>
                  {todayStats
                    ? `Logged ${todayStats.mealsCount} meal${todayStats.mealsCount === 1 ? '' : 's'}`
                    : 'Capture a meal to unlock insights'}
                </Text>
                <View style={styles.todayStatsRow}>
                  <View style={styles.todayStatPill}>
                    <Text style={[TextStyles.caption, { color: colors.icon }]}>Meals</Text>
                    <Text style={[TextStyles.h3, { color: colors.text }]}>
                      {todayStats ? todayStats.mealsCount : 0}
                    </Text>
                  </View>
                  <View style={styles.todayStatPill}>
                    <Text style={[TextStyles.caption, { color: colors.icon }]}>Calories</Text>
                    <Text style={[TextStyles.h3, { color: colors.text }]}>
                      {formatMacroValue(todayStats?.totalCalories ?? null, '')}
                    </Text>
                  </View>
                </View>
              </View>
              <Mascot mood={todayStats ? 'encouraging' : 'excited'} size={64} />
            </TouchableOpacity>
          </Card>
        </Section>

        {/* Nutrition Breakdown */}
        <Section gap={PageSpacing.cardGap}>
          <Card variant="glass">
            <View style={styles.chartHeader}>
              <Text style={[TextStyles.h4, { color: colors.text }]}>Nutrition breakdown</Text>
              <View style={styles.periodFilters}>
                {(['today', 'week', 'all'] as const).map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodFilterButton,
                      chartPeriod === period && styles.periodFilterButtonActive,
                      { borderColor: glassBorder },
                    ]}
                    onPress={() => setChartPeriod(period)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        TextStyles.bodySmall,
                        {
                          color: chartPeriod === period ? '#000000' : colors.icon,
                          fontWeight: chartPeriod === period ? '600' : '400',
                        },
                      ]}
                    >
                      {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'All'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {(() => {
              const filteredMeals = getFilteredMeals(chartPeriod);
              const stats = calculateMacroStats(filteredMeals);
              const pieData = getPieChartData();

              if (filteredMeals.length === 0 || pieData.length === 0) {
                return (
                  <View style={styles.emptyChart}>
                    <IconSymbol name="chart.pie" size={48} color={colors.icon} />
                    <Text style={[TextStyles.body, { color: colors.text, marginTop: Spacing.base }]}>
                      No nutrition data available
                    </Text>
                    <Text style={[TextStyles.bodySmall, { color: colors.icon, marginTop: Spacing.xs }]}>
                      Capture meals with nutrition info to see your breakdown
                    </Text>
                  </View>
                );
              }

              return (
                <View style={styles.chartContainer}>
                  <View style={styles.chartWrapper}>
                    <PieChart data={pieData} size={220} strokeWidth={28} />
                    <View style={styles.chartCenter}>
                      <Text 
                        style={[TextStyles.body, { color: colors.text, fontWeight: '600', fontSize: 18 }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.7}
                      >
                        {Math.round(stats.totalCalories)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.macroLegend}>
                    {pieData.map((item, index) => {
                      const percentage =
                        stats.totalMacroCalories > 0
                          ? Math.round((item.value / stats.totalMacroCalories) * 100)
                          : 0;
                      return (
                        <View key={`${item.label}-${index}`} style={styles.macroLegendItem}>
                          <View style={[styles.macroLegendDot, { backgroundColor: item.color }]} />
                          <View style={styles.macroLegendText}>
                            <Text style={[TextStyles.bodyMedium, { color: colors.text }]}>
                              {item.label}
                            </Text>
                            <Text style={[TextStyles.caption, { color: colors.icon }]}>
                              {percentage}%
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {(() => {
                    const weeklyCalories = getWeeklyCalories();
                    const maxCalories = Math.max(...weeklyCalories, 1);
                    return (
                      <View style={styles.weeklyCalorieChart}>
                        <Text style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: Spacing.sm }]}>
                          Weekly calorie intake
                        </Text>
                        <View style={styles.weeklyCalorieBars}>
                          {weeklyCalories.map((calories, index) => {
                            const barHeight = maxCalories > 0 ? (calories / maxCalories) * 100 : 0;
                            return (
                              <View key={daysOfWeek[index]} style={styles.weeklyCalorieDay}>
                                <View style={styles.weeklyCalorieBarContainer}>
                                  <View
                                    style={[
                                      styles.weeklyCalorieBar,
                                      {
                                        height: `${barHeight}%`,
                                        backgroundColor: getWeeklyCalorieColor(calories),
                                        minHeight: barHeight > 0 ? 4 : 0,
                                      },
                                    ]}
                                  />
                                  {calories > 0 && (
                                    <Text style={[TextStyles.caption, styles.weeklyCalorieLabel, { color: colors.text }]}>
                                      {Math.round(calories)}
                                    </Text>
                                  )}
                                </View>
                                <Text style={[TextStyles.caption, { color: colors.icon, marginTop: Spacing.xs }]}>
                                  {daysOfWeek[index]}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })()}
                </View>
              );
            })()}
          </Card>
        </Section>

        {/* Action Cards */}
        <Section gap={PageSpacing.cardGap}>
          {/* Capture a Meal */}
          <Card variant="glass">
            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/log')}
              accessibilityRole="button"
              accessibilityLabel="Capture a meal"
              accessibilityHint="Opens the meal capture screen"
            >
              <View style={styles.actionCardContent}>
                <View style={styles.actionCardHeader}>
                  <IconSymbol name="camera.fill" size={24} color={neonGreen} />
                  <Text style={[TextStyles.h4, { color: colors.text, marginLeft: Spacing.sm }]}>
                    Capture a Meal
                  </Text>
                </View>
                <Text style={[TextStyles.body, { color: colors.icon, marginTop: Spacing.xs }]}>
                  Take a photo of your food or describe it to get instant nutritional analysis.
                </Text>
                <TouchableOpacity
                  style={styles.actionCardLink}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push('/(tabs)/log');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[TextStyles.bodySmall, { color: neonGreen }]}>Get started</Text>
                  <IconSymbol name="chevron.right" size={14} color={neonGreen} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Card>

          {/* View Journal */}
          <Card variant="glass">
            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/journal')}
              accessibilityRole="button"
              accessibilityLabel="View journal"
              accessibilityHint="Opens your meal history"
            >
              <View style={styles.actionCardContent}>
                <View style={styles.actionCardHeader}>
                  <IconSymbol name="book" size={24} color={neonGreen} />
                  <Text style={[TextStyles.h4, { color: colors.text, marginLeft: Spacing.sm }]}>
                    View Journal
                  </Text>
                </View>
                <Text style={[TextStyles.body, { color: colors.icon, marginTop: Spacing.xs }]}>
                  Track your meal history and nutrition patterns over time.
                </Text>
                <TouchableOpacity
                  style={styles.actionCardLink}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push('/(tabs)/journal');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[TextStyles.bodySmall, { color: neonGreen }]}>See your meals</Text>
                  <IconSymbol name="chevron.right" size={14} color={neonGreen} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Card>

          {/* Edit Your Goal */}
          <Card variant="glass">
            <TouchableOpacity
              style={styles.actionCard}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/settings')}
              accessibilityRole="button"
              accessibilityLabel="Edit your goal"
              accessibilityHint="Opens settings to update health goals"
            >
              <View style={styles.actionCardContent}>
                <View style={styles.actionCardHeader}>
                  <IconSymbol name="target" size={24} color={neonGreen} />
                  <Text style={[TextStyles.h4, { color: colors.text, marginLeft: Spacing.sm }]}>
                    Edit Your Goal
                  </Text>
                </View>
                <Text style={[TextStyles.body, { color: colors.icon, marginTop: Spacing.xs }]}>
                  Update your health data and nutrition targets.
                </Text>
                <TouchableOpacity
                  style={styles.actionCardLink}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push('/(tabs)/settings');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[TextStyles.bodySmall, { color: neonGreen }]}>Update goals</Text>
                  <IconSymbol name="chevron.right" size={14} color={neonGreen} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Card>
        </Section>

        {/* Progress Overview */}
        <Section>
          <View style={styles.sectionHeader}>
            <Text style={[TextStyles.h4, { color: colors.text }]}>Progress & consistency</Text>
          </View>
        </Section>

        <Section gap={PageSpacing.cardGap}>
          <Card variant="glass">
            <View style={styles.heroContent}>
              <Mascot mood="encouraging" size={56} />
              <View style={styles.heroText}>
                <Text style={[TextStyles.h4, { color: colors.text }]}>
                  {currentStreak > 0
                    ? `You're on a ${currentStreak}-day streak`
                    : "Let's build your first streak"}
                </Text>
                <Text style={[TextStyles.bodySmall, { color: colors.icon, marginTop: Spacing.xs }]}>
                  {currentStreak > 0
                    ? 'Stay consistent and extend your streak tomorrow.'
                    : 'Capture meals daily to unlock streaks and badges.'}
                </Text>
              </View>
            </View>
          </Card>
        </Section>

        <Section gap={PageSpacing.cardGap}>
          <Card variant="glass">
            <View style={styles.streakHeader}>
              <View
                style={[
                  styles.streakIconContainer,
                  { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 },
                ]}
              >
                <IconSymbol name="flame.fill" size={32} color={neonGreen} />
              </View>
              <View style={styles.streakContent}>
                <Text style={[TextStyles.h3, { color: colors.text }]}>{currentStreak} Days</Text>
                <Text style={[TextStyles.bodySmall, { color: colors.icon, marginTop: Spacing.xs }]}>
                  Current streak
                </Text>
              </View>
            </View>
            <View style={styles.streakFooter}>
              <Tag color="accent">Longest: {longestStreak} days</Tag>
            </View>
          </Card>
        </Section>

        <Section gap={PageSpacing.cardGap}>
          <Card variant="glass">
            <View style={styles.xpHeader}>
              <Text style={[TextStyles.h4, { color: colors.text }]}>Level {currentLevel}</Text>
              <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
                {currentXP} / {nextLevelXP} XP
              </Text>
            </View>
            <View style={styles.xpBarContainer}>
              <View style={[styles.xpBarTrack, { backgroundColor: glassSurface }]}>
                <View
                  style={[
                    styles.xpBarFill,
                    {
                      width: `${xpProgress}%`,
                      backgroundColor: neonGreen,
                      shadowColor: neonGreen,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.6,
                      shadowRadius: 8,
                    },
                  ]}
                />
              </View>
            </View>
          </Card>
        </Section>

        <Section gap={PageSpacing.cardGap}>
          <Card variant="glass">
            <Text style={[TextStyles.h4, { color: colors.text, marginBottom: Spacing.base }]}>
              This week
            </Text>
            <View style={styles.weeklyChart}>
              {weeklyData.map((meals, index) => (
                <View key={daysOfWeek[index]} style={styles.weeklyDay}>
                  <View
                    style={[
                      styles.weeklyBar,
                      {
                        height: meals * 20 + 8,
                        backgroundColor: getDayColor(meals),
                        minHeight: 8,
                      },
                    ]}
                  />
                  <Text style={[TextStyles.caption, { color: colors.icon, marginTop: Spacing.sm }]}>
                    {daysOfWeek[index]}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </Section>

        {/* Milestones */}
        <Section>
          <Text style={[TextStyles.h4, { color: colors.text, marginBottom: Spacing.base }]}>
            Milestones
          </Text>
          <View style={styles.badgesGrid}>
            {achievements.slice(0, 4).map((achievement, index) => {
              const colorMap: Record<string, 'neon' | 'mint' | 'sky' | 'coral'> = {
                coral: 'coral',
                yellow: 'neon',
                green: 'neon',
                lavender: 'sky',
                sky: 'sky',
              };
              return (
                <Badge
                  key={`${achievement.title}-${index}`}
                  icon={achievement.icon}
                  title={achievement.title}
                  unlocked={achievement.unlocked}
                  accentColor={colorMap[achievement.color] || 'neon'}
                />
              );
            })}
          </View>
        </Section>
      </ContentContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: PageSpacing.containerPadding,
  },
  actionCard: {
    width: '100%',
  },
  actionCardContent: {
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
  todaySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.base,
    padding: Spacing.base,
  },
  todaySummaryText: {
    flex: 1,
    gap: Spacing.sm,
  },
  todayStatsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  todayStatPill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: 16,
    backgroundColor: glassSurface,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  heroText: {
    flex: 1,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    marginBottom: Spacing.base,
  },
  streakIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: primaryGreen + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakContent: {
    flex: 1,
  },
  streakFooter: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  xpBarContainer: {
    width: '100%',
  },
  xpBarTrack: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  weeklyChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
  },
  weeklyDay: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  weeklyBar: {
    width: '80%',
    borderRadius: 8,
    minHeight: 8,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'flex-start',
  },
  chartHeader: {
    marginBottom: Spacing.base,
  },
  periodFilters: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.base,
  },
  periodFilterButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderRadius: 9999,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  periodFilterButtonActive: {
    backgroundColor: neonGreen,
    borderColor: neonGreen,
  },
  emptyChart: {
    alignItems: 'center',
    padding: PageSpacing.cardGap,
    gap: Spacing.sm,
  },
  chartContainer: {
    gap: Spacing.base,
    alignItems: 'center',
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: Spacing.base,
    width: 220,
    height: 220,
    alignSelf: 'center',
  },
  chartCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  macroLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.base,
  },
  macroLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  macroLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  macroLegendText: {
    gap: 2,
  },
  weeklyCalorieChart: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: glassBorder,
    width: '100%',
  },
  weeklyCalorieBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    gap: Spacing.xs,
  },
  weeklyCalorieDay: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  weeklyCalorieBarContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  weeklyCalorieBar: {
    width: '100%',
    borderRadius: 6,
    minHeight: 4,
  },
  weeklyCalorieLabel: {
    position: 'absolute',
    top: -18,
    fontSize: 10,
    fontWeight: '500',
  },
});
