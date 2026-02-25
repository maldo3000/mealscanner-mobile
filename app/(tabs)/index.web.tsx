import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { DailyTip } from '@/components/dashboard/DailyTip';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentMealsList } from '@/components/dashboard/RecentMealsList';
import { WeeklyReport } from '@/components/dashboard/WeeklyReport';
import { StreakCard } from '@/components/streak';
import { NutritionHero } from '@/components/ui/NutritionHero';
import { ProBadge } from '@/components/ui/ProBadge';
import { Brand } from '@/constants/Brand';
import { useSubscription } from '@/context/SubscriptionContext';
import { calculateCurrentStreak, calculateLongestStreak } from '@/lib/streakUtils';
import { getAllUserMeals, getCurrentUser, supabase } from '@/lib/supabase';
import { computeStreakSummary } from '@/services/streakService';
import type { StreakCardState, StreakSummary } from '@/types/streak';

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

export default function HomeScreenWeb() {
  const { isPro } = useSubscription();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [streakSummary, setStreakSummary] = useState<StreakSummary | null>(null);
  const [previousCardState, setPreviousCardState] = useState<StreakCardState | undefined>(undefined);

  const [weeklyCalories, setWeeklyCalories] = useState<number[][]>([
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
  ]);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(
    (new Date().getDay() + 6) % 7
  );
  const [selectedWeekIndex, setSelectedDateWeekIndex] = useState<number>(2);
  const [weeklyStats, setWeeklyStats] = useState<TodayStats[][]>([
    Array.from({ length: 7 }, () => ({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 })),
    Array.from({ length: 7 }, () => ({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 })),
    Array.from({ length: 7 }, () => ({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 })),
  ]);
  const [allMeals, setAllMeals] = useState<Meal[]>([]);

  const resetState = () => {
    setCurrentStreak(0);
    setStreakSummary(null);
    setPreviousCardState(undefined);
    setWeeklyCalories([[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]]);
    setWeeklyStats([
      Array.from({ length: 7 }, () => ({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 })),
      Array.from({ length: 7 }, () => ({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 })),
      Array.from({ length: 7 }, () => ({ mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 })),
    ]);
    setAllMeals([]);
  };

  const loadData = async (isRefreshing = false, silent = false): Promise<void> => {
    try {
      if (isRefreshing) setRefreshing(true);
      else if (!silent) setLoading(true);

      const { user } = await getCurrentUser();
      if (!user) { resetState(); return; }

      const daysLimit = isPro ? undefined : 7;
      const { data: meals, error } = await getAllUserMeals(user.id, daysLimit);
      if (error || !meals) { resetState(); return; }

      setAllMeals(meals);
      setCurrentStreak(calculateCurrentStreak(meals));

      if (streakSummary) setPreviousCardState(streakSummary.cardState);
      const mealsForStreak = meals.map(m => ({
        id: m.id, created_at: m.created_at, health_score: m.health_score,
      }));
      setStreakSummary(await computeStreakSummary(mealsForStreak, user.id));

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
        let weekIdx = -1;
        if (mealDay >= currentMonday) weekIdx = 2;
        else if (mealDay >= lastMonday) weekIdx = 1;
        else if (mealDay >= twoWeeksAgoMonday) weekIdx = 0;
        if (weekIdx >= 0) {
          const dayIdx = (mealDay.getDay() + 6) % 7;
          if (dayIdx >= 0 && dayIdx < 7) {
            newWeeklyStats[weekIdx][dayIdx].mealsCount += 1;
            newWeeklyStats[weekIdx][dayIdx].totalCalories += meal.calories || 0;
            newWeeklyStats[weekIdx][dayIdx].totalProtein += meal.macros?.protein || 0;
            newWeeklyStats[weekIdx][dayIdx].totalFat += meal.macros?.fat || 0;
            newWeeklyStats[weekIdx][dayIdx].totalCarbs += meal.macros?.carbs || 0;
          }
        }
      });
      setWeeklyStats(newWeeklyStats);
      setWeeklyCalories(newWeeklyStats.map(w => w.map(s => s.totalCalories)));
    } catch (err) {
      console.error('Error loading home data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) loadData();
      else resetState();
    });
    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  useFocusEffect(useCallback(() => {
    if (!loading) loadData(false, true);
  }, [loading]));

  const onRefresh = useCallback(() => { loadData(true); }, []);

  const weekReport = useMemo(() => {
    const currentWeek = weeklyStats[2];
    const totalMeals = currentWeek.reduce((s, d) => s + d.mealsCount, 0);
    const totalCal = currentWeek.reduce((s, d) => s + d.totalCalories, 0);
    const daysWithMeals = currentWeek.filter(d => d.mealsCount > 0).length;
    return { totalMeals, avgCalories: daysWithMeals > 0 ? totalCal / daysWithMeals : 0 };
  }, [weeklyStats]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Brand.matcha} />
        <Text style={styles.loadingText}>Optimizing your dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Brand.matcha} />
      }
    >
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Today</Text>
        {isPro && <ProBadge style={{ marginTop: 4 }} />}
      </View>

      {/* ── Row 1: Summary | Quick Actions + Progress ── */}
      <View style={styles.row}>
        <View style={styles.colMain}>
          <DashboardCard title="Today Summary" subtitle="Calories + macros at a glance" style={styles.fillCard}>
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
          </DashboardCard>
        </View>
        <View style={styles.colSideStack}>
          <QuickActions />
          <DashboardCard title="Progress" subtitle="Streak + badges" style={styles.fillCard}>
            {streakSummary ? (
              <StreakCard
                streakSummary={streakSummary}
                onLogNow={() => router.push('/(tabs)/log')}
                onViewStreak={() => {}}
                previousCardState={previousCardState}
              />
            ) : (
              <View style={styles.loadingMini}>
                <ActivityIndicator size="small" color={Brand.matcha} />
              </View>
            )}
          </DashboardCard>
        </View>
      </View>

      {/* ── Row 2: Recent Meals | Daily Tip + Weekly Report ── */}
      <View style={styles.row}>
        <View style={styles.colMain}>
          <RecentMealsList meals={allMeals} maxItems={6} />
        </View>
        <View style={styles.colSideStack}>
          <DailyTip />
          <WeeklyReport totalMeals={weekReport.totalMeals} avgCalories={weekReport.avgCalories} />
        </View>
      </View>

      {/* ── Row 3: Full-width Weekly Overview strip ── */}
      <DashboardCard title="Weekly Overview" subtitle="7-day calorie strip">
        <View style={styles.weekStrip}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
            const cal = weeklyCalories[2]?.[i] ?? 0;
            const isToday = i === (new Date().getDay() + 6) % 7;
            const isSelected = selectedWeekIndex === 2 && selectedDateIndex === i;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.weekDay,
                  isSelected && styles.weekDaySelected,
                ]}
                onPress={() => {
                  setSelectedDateWeekIndex(2);
                  setSelectedDateIndex(i);
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.dot,
                    cal > 0 && styles.dotFilled,
                    isToday && styles.dotToday,
                  ]}
                />
                <Text style={[styles.dayLabel, isToday && styles.dayLabelActive]}>
                  {day}
                </Text>
                <Text style={styles.weekCal}>
                  {cal > 0 ? `${Math.round(cal)}` : '—'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </DashboardCard>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Brand.ink,
  },
  scrollContent: {
    maxWidth: 1320,
    // @ts-ignore
    marginLeft: 'auto',
    // @ts-ignore
    marginRight: 'auto',
    width: '100%',
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 48,
  },

  /* ── Header ── */
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  pageTitle: {
    fontFamily: "'Telegraf', sans-serif",
    fontSize: 32,
    fontWeight: '800',
    color: Brand.bone,
    letterSpacing: -0.5,
  },

  /* ── Grid rows ── */
  row: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
    // @ts-ignore
    alignItems: 'stretch',
  },
  colMain: {
    flex: 2,
    minWidth: 0,
  },
  colSideStack: {
    flex: 1,
    minWidth: 280,
    maxWidth: 400,
    gap: 20,
  },
  fillCard: {
    flex: 1,
  },

  /* ── Loading ── */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Brand.ink,
  },
  loadingText: {
    fontFamily: "'Source Sans 3', sans-serif",
    fontSize: 14,
    color: Brand.sage,
    marginTop: 12,
  },
  loadingMini: {
    paddingVertical: 24,
    alignItems: 'center',
  },

  /* ── Weekly Overview strip ── */
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    // @ts-ignore
    cursor: 'pointer',
    // @ts-ignore
    transition: 'background-color 0.15s',
  },
  weekDaySelected: {
    backgroundColor: Brand.surface2,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Brand.surface2,
    borderWidth: 1.5,
    borderColor: Brand.border,
  },
  dotFilled: {
    backgroundColor: Brand.matcha,
    borderColor: Brand.matcha,
  },
  dotToday: {
    borderColor: Brand.matcha,
    borderWidth: 2,
  },
  dayLabel: {
    fontFamily: "'Source Sans 3', sans-serif",
    fontSize: 13,
    color: Brand.sage,
  },
  dayLabelActive: {
    color: Brand.matcha,
    fontWeight: '600',
  },
  weekCal: {
    fontFamily: "'Source Sans 3', sans-serif",
    fontSize: 11,
    color: Brand.sage,
    opacity: 0.7,
  },
});
