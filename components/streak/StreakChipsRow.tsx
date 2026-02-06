/**
 * StreakChipsRow Component
 * Three secondary stat chips: Next Milestone, Balanced Week, Consistency Score
 */

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { BorderRadius } from '@/constants/Layout';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { StreakSummary } from '@/types/streak';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface StreakChipsRowProps {
  streakSummary: StreakSummary;
}

interface ChipProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

function Chip({ icon, title, subtitle }: ChipProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={[styles.chip, { backgroundColor: colors.surface }]}>
      <View style={styles.chipIconContainer}>
        {icon}
      </View>
      <Text style={[styles.chipTitle, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.chipSubtitle, { color: colors.icon }]} numberOfLines={1}>
        {subtitle}
      </Text>
    </View>
  );
}

export function StreakChipsRow({ streakSummary }: StreakChipsRowProps) {
  const { nextMilestone, weeklyStats } = streakSummary;

  return (
    <View style={styles.container}>
      {/* Chip 1: Next Milestone */}
      <Chip
        icon={
          <View style={styles.milestoneIconBg}>
            <IconSymbol name="bolt.fill" size={20} color="#fbbf24" />
          </View>
        }
        title="Next Milestone"
        subtitle={`${nextMilestone?.day || 3}-Day Badge`}
      />

      {/* Chip 2: Balanced Week */}
      <Chip
        icon={
          <View style={styles.balancedIconBg}>
            <IconSymbol name="leaf.fill" size={18} color="#22c55e" />
            <View style={styles.checkBadge}>
              <IconSymbol name="checkmark.circle.fill" size={12} color="#22c55e" />
            </View>
          </View>
        }
        title="Balanced Week"
        subtitle={`Balanced days: ${weeklyStats.balancedDaysThisWeek}/7`}
      />

      {/* Chip 3: Consistency Score */}
      <Chip
        icon={
          <View style={styles.consistencyIconBg}>
            <IconSymbol name="calendar" size={18} color="#38bdf8" />
            <View style={styles.checkBadge}>
              <IconSymbol name="checkmark.circle.fill" size={12} color="#22c55e" />
            </View>
          </View>
        }
        title="Consistency Score"
        subtitle={`Logging days: ${weeklyStats.loggedDaysThisWeek}/7`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    minHeight: 100,
  },
  chipIconContainer: {
    marginBottom: Spacing.sm,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipTitle: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  chipSubtitle: {
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.8,
  },
  // Milestone icon (bolt badge)
  milestoneIconBg: {
    width: 40,
    height: 44,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    // Shield shape approximation
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  // Balanced icon (plate with food)
  balancedIconBg: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  // Consistency icon (calendar)
  consistencyIconBg: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0C3327',
    borderRadius: 6,
  },
});

export default StreakChipsRow;
