import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Brand } from '@/constants/Brand';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { DashboardCard } from './DashboardCard';

interface Meal {
  id: string;
  description: string;
  calories?: number;
  created_at: string;
  image_url?: string;
}

interface RecentMealsListProps {
  meals: Meal[];
  maxItems?: number;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  const time = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function RecentMealsList({ meals, maxItems = 5 }: RecentMealsListProps) {
  const router = useRouter();
  const displayed = meals.slice(0, maxItems);

  const headerRight = meals.length > 0 ? (
    <TouchableOpacity
      onPress={() => router.push('/(tabs)/journal')}
      style={styles.viewAll}
    >
      <Text style={styles.viewAllText}>View All</Text>
      <IconSymbol name="chevron.right" size={12} color={Brand.matcha} />
    </TouchableOpacity>
  ) : undefined;

  return (
    <DashboardCard
      title="Recent Meals"
      subtitle={`Last ${displayed.length} entries`}
      headerRight={headerRight}
      noPadding
    >
      {displayed.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No meals logged yet. Start capturing!
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {displayed.map((meal, i) => (
            <TouchableOpacity
              key={meal.id}
              style={[styles.row, i === displayed.length - 1 && styles.rowLast]}
              onPress={() => router.push(`/meal/${meal.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.mealDot} />
              <Text style={styles.mealName} numberOfLines={1}>
                {meal.description}
              </Text>
              <Text style={styles.mealTime}>{formatTime(meal.created_at)}</Text>
              <Text style={styles.mealCal}>
                {meal.calories ? `${Math.round(meal.calories)} kcal` : '—'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    // @ts-ignore
    cursor: 'pointer',
  },
  viewAllText: {
    fontFamily: "'Source Sans 3', sans-serif",
    fontSize: 13,
    fontWeight: '600',
    color: Brand.matcha,
  },
  list: {
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
    // @ts-ignore
    cursor: 'pointer',
    // @ts-ignore
    transition: 'background-color 0.15s',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  mealDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Brand.matcha,
    opacity: 0.5,
  },
  mealName: {
    flex: 1,
    fontFamily: "'Source Sans 3', sans-serif",
    fontSize: 14,
    fontWeight: '600',
    color: Brand.bone,
  },
  mealTime: {
    fontFamily: "'Source Sans 3', sans-serif",
    fontSize: 13,
    color: Brand.sage,
    minWidth: 100,
    textAlign: 'right',
  },
  mealCal: {
    fontFamily: "'Source Sans 3', sans-serif",
    fontSize: 13,
    fontWeight: '600',
    color: Brand.sage,
    minWidth: 70,
    textAlign: 'right',
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: "'Source Sans 3', sans-serif",
    fontSize: 14,
    color: Brand.sage,
  },
});
