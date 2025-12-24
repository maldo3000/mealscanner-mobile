import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ContentContainer } from '@/components/layout/ContentContainer';
import { PageContainer } from '@/components/layout/PageContainer';
import { Section } from '@/components/layout/Section';
import { Badge } from '@/components/ui/Badge';
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
  const [weeklyCalories, setWeeklyCalories] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number>((new Date().getDay() + 6) % 7);
  const [weeklyStats, setWeeklyStats] = useState<TodayStats[]>([
    { mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 },
    { mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 },
    { mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 },
    { mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 },
    { mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 },
    { mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 },
    { mealsCount: 0, totalCalories: 0, totalProtein: 0, totalFat: 0, totalCarbs: 0 },
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

  const resetState = () => {
    setCurrentStreak(0);
    setLongestStreak(0);
    setWeeklyCalories([0, 0, 0, 0, 0, 0, 0]);
    setWeeklyStats(Array(7).fill({
      mealsCount: 0,
      totalCalories: 0,
      totalProtein: 0,
      totalFat: 0,
      totalCarbs: 0,
    }));
    setAllMeals([]);
  };

  const loadData = async (isRefreshing = false): Promise<void> => {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);
      
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
      
      // Calculate weekly stats
      const newWeeklyStats = Array.from({ length: 7 }, () => ({
        mealsCount: 0,
        totalCalories: 0,
        totalProtein: 0,
        totalFat: 0,
        totalCarbs: 0,
      }));

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const dayOfWeek = today.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMonday);
      
      meals.forEach(meal => {
        const mealDate = new Date(meal.created_at);
        const mealDay = new Date(mealDate.getFullYear(), mealDate.getMonth(), mealDate.getDate());
        
        if (mealDay >= monday) {
          const index = (mealDay.getDay() + 6) % 7;
          if (index >= 0 && index < 7) {
            newWeeklyStats[index].mealsCount += 1;
            newWeeklyStats[index].totalCalories += meal.calories || 0;
            newWeeklyStats[index].totalProtein += meal.macros?.protein || 0;
            newWeeklyStats[index].totalFat += meal.macros?.fat || 0;
            newWeeklyStats[index].totalCarbs += meal.macros?.carbs || 0;
          }
        }
      });

      setWeeklyStats(newWeeklyStats);
      setWeeklyCalories(newWeeklyStats.map(s => s.totalCalories));

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
        <Section gap={PageSpacing.cardGap}>
          <NutritionHero 
            stats={weeklyStats[selectedDateIndex]} 
            weeklyCalories={weeklyCalories} 
            selectedDateIndex={selectedDateIndex}
            onSelectDate={setSelectedDateIndex}
            currentStreak={currentStreak}
          />
        </Section>

        {/* Discovery / Inspiration Section */}
        <Section gap={Spacing.md}>
          <View style={styles.sectionHeader}>
            <Text style={[TextStyles.h4, { color: colors.text }]}>Inspiration</Text>
          </View>
          <DiscoveryCard 
            type="recipe"
            title="High-Protein Quinoa Bowl"
            subtitle="Perfect for hitting your protein goal while staying light."
            imageUrl="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80"
          />
          <DiscoveryCard 
            type="tip"
            title="Hydration is Key"
            subtitle="Drinking 500ml of water before meals can help with satiety."
          />
        </Section>

        {/* Consistency & Progress */}
        <Section gap={Spacing.md}>
          <View style={styles.sectionHeader}>
            <Text style={[TextStyles.h4, { color: colors.text }]}>Consistency</Text>
          </View>
          
          <Card variant="glass" style={styles.streakCard}>
            <View style={styles.streakContent}>
              <View style={[styles.streakIconContainer, { backgroundColor: `${neonGreen}20` }]}>
                <IconSymbol name="flame.fill" size={32} color={neonGreen} />
              </View>
              <View style={styles.streakText}>
                <Text style={[TextStyles.h2, { color: colors.text }]}>{currentStreak} Day Streak</Text>
                <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
                  {currentStreak > 0 ? "You're on fire! Keep it up." : "Log a meal to start your streak!"}
                </Text>
              </View>
            </View>
            <View style={styles.streakFooter}>
              <Tag color="accent">Best: {longestStreak} days</Tag>
            </View>
          </Card>

          {/* Centered Milestones/Achievements */}
          <View style={styles.centeredBadgesContainer}>
            <View style={styles.badgesGrid}>
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
          </View>
        </Section>

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
  streakCard: {
    padding: Spacing.lg,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  streakIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${neonGreen}40`,
  },
  streakText: {
    flex: 1,
  },
  streakFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
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
  centeredBadgesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: Spacing.sm,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'center',
  },
});
