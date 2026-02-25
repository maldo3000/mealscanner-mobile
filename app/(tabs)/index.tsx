import BottomSheet from '@gorhom/bottom-sheet';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';

import { ContentContainer } from '@/components/layout/ContentContainer';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { DailyNutritionTipCard } from '@/components/nutrition/DailyNutritionTipCard';
import { NutritionTipSheet } from '@/components/nutrition/NutritionTipSheet';
import { WeeklyReportSheet } from '@/components/reports/WeeklyReportSheet';
import { StreakCard, StreakHubSheet } from '@/components/streak';
import { Paywall } from '@/components/subscription/Paywall';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DiscoveryCard } from '@/components/ui/DiscoveryCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { HowItWorksTutorialModal } from '@/components/ui/HowItWorksTutorialModal';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { NutritionHero } from '@/components/ui/NutritionHero';
import { ProBadge } from '@/components/ui/ProBadge';
import { SwirlingSpinner } from '@/components/ui/SwirlingSpinner';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import { useCaptureOptional } from '@/context/CaptureContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useTheme } from '@/context/ThemeContext';
import { useMealsQuery } from '@/hooks/queries/useMealsQuery';
import { useStreakMealsQuery } from '@/hooks/queries/useStreakMealsQuery';
import { useWeeklyReportStatusQuery } from '@/hooks/queries/useWeeklyReportStatusQuery';
import { useHowItWorksTutorial } from '@/hooks/useHowItWorksTutorial';
import { getDailyNutritionTip } from '@/lib/nutritionTips';
import { calculateCurrentStreak, calculateLongestStreak } from '@/lib/streakUtils';
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

export default function HomeScreen() {
  const { isPro, isBetaTester } = useSubscription();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { tokens } = useTheme();
  const router = useRouter();
  const capture = useCaptureOptional();
  const {
    isLoadingSeenState,
    hasSeenHowItWorks,
    markHowItWorksSeen,
  } = useHowItWorksTutorial();

  // Streak Hub sheet ref
  const streakHubRef = useRef<BottomSheet>(null);
  const tipSheetRef = useRef<BottomSheet>(null);
  const weeklyReportRef = useRef<BottomSheet>(null);
  const hasProAccess = isPro || isBetaTester;

  // Free users are limited to 7 days of history
  const daysLimit = hasProAccess ? undefined : 7;

  // React Query: meals (day-limited for free users)
  const {
    meals: allMeals,
    isLoading: isMealsLoading,
    isRefetching: isMealsRefetching,
    refetch: refetchMeals,
  } = useMealsQuery({ userId: user?.id, daysLimit });

  // React Query: all meals for streak (no day limit, lightweight fields only)
  const {
    streakMeals,
    isLoading: isStreakMealsLoading,
    refetch: refetchStreakMeals,
  } = useStreakMealsQuery({ userId: user?.id });

  // React Query: weekly report status
  const {
    reportStatus: rawReportStatus,
    invalidate: invalidateReportStatus,
  } = useWeeklyReportStatusQuery({ userId: user?.id, enabled: hasProAccess });

  const loading = isAuthLoading || isMealsLoading;

  const [selectedDateIndex, setSelectedDateIndex] = useState<number>((new Date().getDay() + 6) % 7);
  const [selectedWeekIndex, setSelectedDateWeekIndex] = useState<number>(2);

  // Streak summary state
  const [streakSummary, setStreakSummary] = useState<StreakSummary | null>(null);
  const [previousCardState, setPreviousCardState] = useState<StreakCardState | undefined>(undefined);

  const [healthData, setHealthData] = useState<{ steps: number; activeCalories: number } | undefined>(undefined);
  const [dailyTip, setDailyTip] = useState(() => getDailyNutritionTip(new Date()));
  const [isHowItWorksVisible, setIsHowItWorksVisible] = useState(false);
  const [hasAutoShownHowItWorks, setHasAutoShownHowItWorks] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  // Derived: weekly report widget status
  const reportWidgetStatus = useMemo(() => {
    if (!rawReportStatus) {
      return { hasReport: false, isLocked: false, daysRemaining: 0, summaryLine: '' };
    }
    return {
      hasReport: rawReportStatus.hasReport,
      isLocked: rawReportStatus.isLocked,
      daysRemaining: rawReportStatus.daysRemaining,
      summaryLine: rawReportStatus.latestReport?.summary_line ?? '',
    };
  }, [rawReportStatus]);

  // Derived: current and longest streak (uses full history, not day-limited)
  const currentStreak = useMemo(() => calculateCurrentStreak(streakMeals), [streakMeals]);
  const longestStreak = useMemo(() => calculateLongestStreak(streakMeals), [streakMeals]);

  // Derived: 3-week stats
  const { weeklyStats, weeklyCalories } = useMemo(() => {
    const stats: TodayStats[][] = [
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

    allMeals.forEach(meal => {
      const mealDate = new Date(meal.created_at);
      const mealDay = new Date(mealDate.getFullYear(), mealDate.getMonth(), mealDate.getDate());

      let weekIdx = -1;
      if (mealDay >= currentMonday) weekIdx = 2;
      else if (mealDay >= lastMonday) weekIdx = 1;
      else if (mealDay >= twoWeeksAgoMonday) weekIdx = 0;

      if (weekIdx >= 0) {
        const dayIdx = (mealDay.getDay() + 6) % 7;
        if (dayIdx >= 0 && dayIdx < 7) {
          stats[weekIdx][dayIdx].mealsCount += 1;
          stats[weekIdx][dayIdx].totalCalories += meal.calories || 0;
          stats[weekIdx][dayIdx].totalProtein += meal.macros?.protein || 0;
          stats[weekIdx][dayIdx].totalFat += meal.macros?.fat || 0;
          stats[weekIdx][dayIdx].totalCarbs += meal.macros?.carbs || 0;
        }
      }
    });

    return {
      weeklyStats: stats,
      weeklyCalories: stats.map(week => week.map(s => s.totalCalories)),
    };
  }, [allMeals]);

  // Compute streak summary from full meal history (not day-limited)
  useEffect(() => {
    if (!user?.id) {
      setStreakSummary(null);
      return;
    }

    if (streakMeals.length === 0) {
      setStreakSummary(null);
      return;
    }

    // Save previous state for transition detection
    if (streakSummary) {
      setPreviousCardState(streakSummary.cardState);
    }

    void computeStreakSummary(streakMeals, user.id)
      .then(setStreakSummary)
      .catch(() => setStreakSummary(null));
  }, [streakMeals, user?.id]);

  const resolveMealTitle = (meal: Meal): string => {
    const aiAnalysis = meal.ai_analysis as { name?: string } | null | undefined;
    const aiName = typeof aiAnalysis?.name === 'string' ? aiAnalysis.name.trim() : '';
    if (aiName.length >= 3 && aiName.length <= 60) {
      return aiName;
    }
    const description = meal.description?.trim();
    return description?.length ? description : 'Meal';
  };

  // Helper to format macro values to 1 decimal point max, removing trailing .0
  const formatMacro = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '0';
    return Number(val.toFixed(1)).toString();
  };

  // Refresh data when screen is focused (silent refresh via React Query staleTime)
  useFocusEffect(
    useCallback(() => {
      const todayIndex = (new Date().getDay() + 6) % 7;
      setSelectedDateWeekIndex(2);
      setSelectedDateIndex(todayIndex);
      setDailyTip(getDailyNutritionTip(new Date()));

      // React Query will only refetch if data is stale
      void refetchMeals();
      void refetchStreakMeals();
    }, [refetchMeals, refetchStreakMeals])
  );

  useEffect(() => {
    if (isAuthLoading || isLoadingSeenState || loading) return;
    if (!user?.id) return;
    if (hasSeenHowItWorks || hasAutoShownHowItWorks) return;

    setHasAutoShownHowItWorks(true);
    setIsHowItWorksVisible(true);
  }, [
    hasAutoShownHowItWorks,
    hasSeenHowItWorks,
    isAuthLoading,
    isLoadingSeenState,
    loading,
    user?.id,
  ]);

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchMeals(), refetchStreakMeals()]);
  }, [refetchMeals, refetchStreakMeals]);

  // Stable callback for date selection
  const handleSelectDate = useCallback((weekIdx: number, dateIdx: number) => {
    setSelectedDateWeekIndex(weekIdx);
    setSelectedDateIndex(dateIdx);
  }, []);

  // Stable callback for log button press
  const handleLogPress = useCallback(() => {
    if (capture?.openCaptureSheet) {
      capture.openCaptureSheet();
    } else {
      router.push('/(tabs)/log');
    }
  }, [capture, router]);

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
          <SwirlingSpinner size="large" color={tokens.accent} />
          <Text style={[TextStyles.body, { color: tokens.textMuted, marginTop: Spacing.base }]}>
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
            refreshing={isMealsRefetching}
            onRefresh={onRefresh}
            tintColor={tokens.accent}
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
              onSelectDate={handleSelectDate}
              currentStreak={currentStreak}
              healthData={healthData}
              onLogPress={handleLogPress}
            />
          </Section>
        </Animated.View>

        {/* Recent Meal Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(200).easing(Easing.out(Easing.quad))}>
          <Section gap={Spacing.xl}>
            <View style={styles.sectionHeader}>
              <Text style={[TextStyles.h4, { color: tokens.textPrimary }]}>Recent Meal</Text>
              {allMeals.length > 0 && (
                <TouchableOpacity onPress={() => router.push('/(tabs)/journal')}>
                  <Text style={[TextStyles.bodySmall, { color: tokens.accent, fontWeight: '600' }]}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {allMeals.length > 0 ? (
              <DiscoveryCard 
                type="meal"
                title={resolveMealTitle(allMeals[0])}
                subtitle={`${allMeals[0].calories ? formatMacro(allMeals[0].calories) + ' kcal • ' : ''}${formatDate(allMeals[0].created_at)}`}
                imageUrl={allMeals[0].image_url}
                mealId={allMeals[0].id}
              />
            ) : (
              <Card variant="glass" style={styles.emptyRecentMeal}>
                <Text style={[TextStyles.body, { color: tokens.textMuted, textAlign: 'center' }]}>
                  No meals logged yet. Start capturing to see your history!
                </Text>
                <Button 
                  variant="primary" 
                  onPress={handleLogPress}
                  style={{ marginTop: Spacing.md }}
                >
                  Log My First Meal
                </Button>
              </Card>
            )}

            <DailyNutritionTipCard
              tip={dailyTip}
              onPress={() => tipSheetRef.current?.expand()}
              style={{ marginTop: Spacing.md }}
            />
          </Section>
        </Animated.View>

        {/* Progress / Streak Card */}
        <Animated.View entering={FadeInDown.duration(600).delay(300).easing(Easing.out(Easing.quad))}>
          <Section gap={Spacing.xl}>
            <View style={styles.sectionHeader}>
              <Text style={[TextStyles.h4, { color: tokens.textPrimary }]}>Progress</Text>
              <TouchableOpacity onPress={() => streakHubRef.current?.expand()}>
                <View style={styles.viewButton}>
                  <Text style={[TextStyles.bodySmall, { color: tokens.accent, fontWeight: '600' }]}>View</Text>
                  <IconSymbol name="chevron.right" size={14} color={tokens.accent} />
                </View>
              </TouchableOpacity>
            </View>
            
            {streakSummary ? (
              <StreakCard
                streakSummary={streakSummary}
                onLogNow={() => {
                  if (capture?.openCaptureSheet) {
                    capture.openCaptureSheet();
                  } else {
                    router.push('/(tabs)/log');
                  }
                }}
                onViewStreak={() => streakHubRef.current?.expand()}
                previousCardState={previousCardState}
              />
            ) : isStreakMealsLoading ? (
              <Card variant="glass" style={styles.progressHubCard}>
                <View style={styles.hubHeroSection}>
                  <SwirlingSpinner size="small" color={tokens.accent} />
                  <Text style={[TextStyles.bodySmall, { color: tokens.textMuted, marginTop: Spacing.sm }]}>
                    Loading streak data...
                  </Text>
                </View>
              </Card>
            ) : (
              <Card variant="glass" style={styles.progressHubCard}>
                <View style={styles.hubHeroSection}>
                  <IconSymbol name="bolt.fill" size={32} color={tokens.textMuted} />
                  <Text style={[TextStyles.bodySmall, { color: tokens.textMuted, marginTop: Spacing.sm }]}>
                    Log your first meal to start a streak!
                  </Text>
                  <Button
                    variant="primary"
                    onPress={handleLogPress}
                    style={{ marginTop: Spacing.md }}
                  >
                    Log a Meal
                  </Button>
                </View>
              </Card>
            )}
          </Section>
        </Animated.View>

        {/* Weekly Nutrition Report Widget */}
        {user?.id && (
          <Animated.View entering={FadeInDown.duration(600).delay(400).easing(Easing.out(Easing.quad))}>
            <Section gap={Spacing.xl}>
              <View style={styles.sectionHeader}>
                <Text style={[TextStyles.h4, { color: tokens.textPrimary }]}>Weekly Report</Text>
                <TouchableOpacity onPress={() => {
                  if (hasProAccess) {
                    weeklyReportRef.current?.expand();
                  } else {
                    setPaywallVisible(true);
                  }
                }}>
                  <View style={styles.viewButton}>
                    <Text style={[TextStyles.bodySmall, { color: tokens.accent, fontWeight: '600' }]}>
                      {reportWidgetStatus.hasReport ? 'View All' : 'Open'}
                    </Text>
                    <IconSymbol name="chevron.right" size={14} color={tokens.accent} />
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  if (hasProAccess) {
                    weeklyReportRef.current?.expand();
                  } else {
                    setPaywallVisible(true);
                  }
                }}
              >
                <GlassCard style={styles.weeklyReportWidget}>
                  <View style={styles.weeklyReportWidgetRow}>
                    <Image
                      source={require('@/assets/images/nutrition-report_icon.png')}
                      style={styles.weeklyReportIcon}
                    />
                    <View style={styles.weeklyReportWidgetContent}>
                      {reportWidgetStatus.hasReport ? (
                        <>
                          <Text style={[TextStyles.bodySmall, { color: tokens.textPrimary, fontWeight: '600' }]} numberOfLines={1}>
                            {reportWidgetStatus.summaryLine || 'Latest report ready'}
                          </Text>
                          <Text style={[TextStyles.caption, { color: tokens.textMuted }]}>
                            {reportWidgetStatus.isLocked
                              ? `Next report in ${reportWidgetStatus.daysRemaining} day${reportWidgetStatus.daysRemaining !== 1 ? 's' : ''}`
                              : 'New report available'}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={[TextStyles.bodySmall, { color: tokens.textPrimary, fontWeight: '600' }]}>
                            Your Personal Nutritionist
                          </Text>
                          <Text style={[TextStyles.caption, { color: tokens.textMuted }]}>
                            Generate your first weekly nutrition analysis
                          </Text>
                        </>
                      )}
                    </View>
                    <IconSymbol name="chevron.right" size={18} color={tokens.textMuted} />
                  </View>
                </GlassCard>
              </TouchableOpacity>
            </Section>
          </Animated.View>
        )}

        <View style={{ height: 70 }} />
      </ContentContainer>

      {/* Streak Hub Bottom Sheet */}
      <StreakHubSheet
        ref={streakHubRef}
        streakSummary={streakSummary}
        onClose={() => {}}
      />

      <NutritionTipSheet
        ref={tipSheetRef}
        tip={dailyTip}
        onClose={() => {}}
      />

      {user?.id && (
        <WeeklyReportSheet
          ref={weeklyReportRef}
          userId={user.id}
          isPro={hasProAccess}
          onRequirePro={() => setPaywallVisible(true)}
          onClose={() => {
            // Refresh widget status after sheet closes (report may have been generated)
            void invalidateReportStatus();
          }}
        />
      )}

      <Paywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        feature="nutrition"
      />

      <HowItWorksTutorialModal
        visible={isHowItWorksVisible}
        onClose={() => setIsHowItWorksVisible(false)}
        onSeen={markHowItWorksSeen}
        onTakePhoto={() => router.push('/(tabs)/log')}
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
  weeklyReportWidget: {
    borderRadius: 20,
  },
  weeklyReportWidgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  weeklyReportIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  weeklyReportWidgetContent: {
    flex: 1,
    gap: 2,
  },
});
