import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/Brand';
import { DashboardCard } from './DashboardCard';

const tips = [
  'Aim for 25–30 g of fibre daily to support gut health and satiety.',
  'Eating protein at every meal helps maintain muscle and curb cravings.',
  'Colourful plates = diverse nutrients. Try adding one new colour today.',
  'Hydration matters: many hunger cues are actually thirst signals.',
  'Slow eating gives your brain 20 minutes to register fullness.',
  'Pre-logging meals can help you make more intentional food choices.',
  'Healthy fats from avocado, nuts and olive oil support nutrient absorption.',
];

export function DailyTip() {
  const tip = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return tips[dayOfYear % tips.length];
  }, []);

  return (
    <DashboardCard title="Daily Tip" subtitle="Nutrition insight">
      <View style={styles.tipRow}>
        <Text style={styles.bullet}>{'•'}</Text>
        <Text style={styles.tipText}>{tip}</Text>
      </View>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  tipRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 16,
    color: Brand.matcha,
    lineHeight: 22,
  },
  tipText: {
    flex: 1,
    fontFamily: "'Source Sans 3', sans-serif",
    fontSize: 14,
    lineHeight: 22,
    color: Brand.bone,
  },
});
