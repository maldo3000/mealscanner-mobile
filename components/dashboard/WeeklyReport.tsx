import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Brand } from '@/constants/Brand';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { DashboardCard } from './DashboardCard';

interface WeeklyReportProps {
  totalMeals: number;
  avgCalories: number;
}

export function WeeklyReport({ totalMeals, avgCalories }: WeeklyReportProps) {
  const router = useRouter();

  return (
    <DashboardCard title="Weekly Report" subtitle="Your week at a glance">
      <View style={styles.stats}>
        <View style={styles.statRow}>
          <Text style={styles.bullet}>{'•'}</Text>
          <Text style={styles.statText}>
            {totalMeals} meal{totalMeals !== 1 ? 's' : ''} logged this week
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.bullet}>{'•'}</Text>
          <Text style={styles.statText}>
            ~{avgCalories > 0 ? Math.round(avgCalories) : '—'} kcal daily avg
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.cta}
        onPress={() => router.push('/(tabs)/journal')}
        activeOpacity={0.8}
      >
        <Text style={styles.ctaText}>View Full Report</Text>
        <IconSymbol name="chevron.right" size={14} color={Brand.matcha} />
      </TouchableOpacity>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  stats: {
    gap: 8,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 16,
    color: Brand.matcha,
    lineHeight: 22,
  },
  statText: {
    flex: 1,
    fontFamily: "'Source Sans 3', sans-serif",
    fontSize: 14,
    lineHeight: 22,
    color: Brand.bone,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Brand.matcha,
    borderRadius: 12,
    paddingVertical: 10,
    // @ts-ignore
    cursor: 'pointer',
    // @ts-ignore
    transition: 'background-color 0.15s',
  },
  ctaText: {
    fontFamily: "'Source Sans 3', sans-serif",
    fontSize: 14,
    fontWeight: '600',
    color: Brand.matcha,
  },
});
