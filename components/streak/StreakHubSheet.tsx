/**
 * StreakHubSheet Component
 * Bottom sheet with detailed streak information
 */

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, neonGreen } from '@/constants/Colors';
import { BorderRadius } from '@/constants/Layout';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { MILESTONE_DAYS, getMilestoneName, type DayLogEntry, type StreakSummary } from '@/types/streak';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useMemo } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface StreakHubSheetProps {
  streakSummary: StreakSummary | null;
  onClose: () => void;
}

// Day names for calendar
const DAY_NAMES = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Format date for display
function formatDateLabel(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Calendar Day component
function CalendarDay({ day, isFirst }: { day: DayLogEntry; isFirst: boolean }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];

  const date = new Date(day.date);
  const dayOfWeek = date.getDay();
  const dayName = DAY_NAMES[dayOfWeek === 0 ? 6 : dayOfWeek - 1];

  return (
    <View style={styles.calendarDay}>
      <Text style={[styles.calendarDayName, { color: colors.icon }]}>
        {dayName}
      </Text>
      <View
        style={[
          styles.calendarDot,
          day.logged && styles.calendarDotLogged,
          day.isToday && styles.calendarDotToday,
          { borderColor: day.isToday ? neonGreen : 'transparent' },
        ]}
      >
        {day.logged && (
          <IconSymbol name="checkmark" size={10} color="#022c22" />
        )}
      </View>
      {isFirst && (
        <Text style={[styles.calendarDateLabel, { color: colors.icon }]}>
          {formatDateLabel(day.date)}
        </Text>
      )}
    </View>
  );
}

// Milestone Item component
function MilestoneItem({ day, achieved, isNext }: { day: number; achieved: boolean; isNext: boolean }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const name = getMilestoneName(day);

  return (
    <View style={[styles.milestoneItem, isNext && styles.milestoneItemNext]}>
      <View
        style={[
          styles.milestoneIcon,
          achieved ? styles.milestoneIconAchieved : styles.milestoneIconPending,
        ]}
      >
        {achieved ? (
          <IconSymbol name="checkmark.circle.fill" size={20} color={neonGreen} />
        ) : (
          <IconSymbol name="circle" size={20} color={colors.icon} />
        )}
      </View>
      <View style={styles.milestoneTextContainer}>
        <Text
          style={[
            styles.milestoneTitle,
            { color: achieved ? colors.text : colors.icon },
          ]}
        >
          {name}
        </Text>
        <Text style={[styles.milestoneSubtitle, { color: colors.icon }]}>
          {achieved ? 'Unlocked' : `${day} days`}
        </Text>
      </View>
      {isNext && (
        <View style={styles.nextBadge}>
          <Text style={styles.nextBadgeText}>NEXT</Text>
        </View>
      )}
    </View>
  );
}

export const StreakHubSheet = forwardRef<BottomSheet, StreakHubSheetProps>(
  ({ streakSummary, onClose }, ref) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'dark'];

    // Snap points
    const snapPoints = useMemo(() => ['70%', '90%'], []);

    // Backdrop component
    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.6}
        />
      ),
      []
    );

    // Handle share
    const handleShare = async () => {
      if (!streakSummary) return;

      try {
        await Share.share({
          message: `I'm on a ${streakSummary.currentStreak}-day streak logging my meals with MealScanner! 🔥`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    };

    if (!streakSummary) return null;

    const { currentStreak, longestStreak, shields, weeklyStats, recentDays, milestones, nextMilestone } = streakSummary;

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={[styles.sheetBackground, { backgroundColor: colors.background }]}
        handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: colors.icon }]}
        onChange={(index) => {
          if (index === -1) onClose();
        }}
      >
        <BottomSheetScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Your streak</Text>
            <TouchableOpacity onPress={() => (ref as any)?.current?.close()}>
              <IconSymbol name="xmark.circle.fill" size={28} color={colors.icon} />
            </TouchableOpacity>
          </View>

          {/* Streak Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: neonGreen }]}>{currentStreak}</Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>Current</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>{longestStreak}</Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>Best</Text>
            </View>
          </View>

          {/* 14-Day Calendar */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Last 14 days</Text>
            <View style={[styles.calendarContainer, { backgroundColor: colors.surface }]}>
              <View style={styles.calendarGrid}>
                {recentDays.map((day, index) => (
                  <CalendarDay key={day.date} day={day} isFirst={index === 0} />
                ))}
              </View>
            </View>
          </View>

          {/* Milestones */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Milestones</Text>
            <View style={[styles.milestonesContainer, { backgroundColor: colors.surface }]}>
              {MILESTONE_DAYS.map((day) => (
                <MilestoneItem
                  key={day}
                  day={day}
                  achieved={milestones.find(m => m.day === day)?.achieved || false}
                  isNext={nextMilestone?.day === day}
                />
              ))}
            </View>
          </View>

          {/* Shields */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Streak Shields</Text>
            <View style={[styles.shieldsContainer, { backgroundColor: colors.surface }]}>
              <View style={styles.shieldsRow}>
                {[...Array(shields.maxShields)].map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.shieldIcon,
                      index < shields.count ? styles.shieldActive : styles.shieldInactive,
                    ]}
                  >
                    <IconSymbol
                      name="shield.fill"
                      size={24}
                      color={index < shields.count ? neonGreen : colors.icon}
                    />
                  </View>
                ))}
              </View>
              <Text style={[styles.shieldsText, { color: colors.icon }]}>
                {shields.count}/{shields.maxShields} shields available
              </Text>
              <Text style={[styles.shieldsSubtext, { color: colors.icon }]}>
                Earn next shield at {shields.nextEarnDay} days
              </Text>
            </View>
          </View>

          {/* Weekly Stats */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>This week</Text>
            <View style={[styles.weeklyContainer, { backgroundColor: colors.surface }]}>
              <View style={styles.weeklyRow}>
                <View style={styles.weeklyItem}>
                  <IconSymbol name="leaf.fill" size={20} color="#22c55e" />
                  <Text style={[styles.weeklyLabel, { color: colors.icon }]}>Balanced</Text>
                  <Text style={[styles.weeklyValue, { color: colors.text }]}>
                    {weeklyStats.balancedDaysThisWeek}/7
                  </Text>
                </View>
                <View style={[styles.weeklyDivider, { backgroundColor: colors.border }]} />
                <View style={styles.weeklyItem}>
                  <IconSymbol name="calendar" size={20} color="#38bdf8" />
                  <Text style={[styles.weeklyLabel, { color: colors.icon }]}>Consistency</Text>
                  <Text style={[styles.weeklyValue, { color: colors.text }]}>
                    {weeklyStats.loggedDaysThisWeek}/7
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Share Button */}
          <TouchableOpacity
            style={[styles.shareButton, { borderColor: neonGreen }]}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <IconSymbol name="square.and.arrow.up" size={18} color={neonGreen} />
            <Text style={[styles.shareButtonText, { color: neonGreen }]}>Share streak</Text>
          </TouchableOpacity>

          {/* Bottom spacing */}
          <View style={styles.bottomSpacer} />
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

StreakHubSheet.displayName = 'StreakHubSheet';

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  // Stats row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 44,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 50,
    opacity: 0.3,
  },
  // Sections
  section: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  // Calendar
  calendarContainer: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  calendarGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarDay: {
    alignItems: 'center',
    flex: 1,
  },
  calendarDayName: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 4,
  },
  calendarDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  calendarDotLogged: {
    backgroundColor: neonGreen,
  },
  calendarDotToday: {
    borderColor: neonGreen,
  },
  calendarDateLabel: {
    fontSize: 8,
    marginTop: 4,
  },
  // Milestones
  milestonesContainer: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  milestoneItemNext: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    marginHorizontal: -Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  milestoneIcon: {
    marginRight: Spacing.sm,
  },
  milestoneIconAchieved: {},
  milestoneIconPending: {
    opacity: 0.5,
  },
  milestoneTextContainer: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  milestoneSubtitle: {
    fontSize: 12,
  },
  nextBadge: {
    backgroundColor: neonGreen,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nextBadgeText: {
    color: '#022c22',
    fontSize: 10,
    fontWeight: '700',
  },
  // Shields
  shieldsContainer: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  shieldsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  shieldIcon: {
    padding: Spacing.xs,
  },
  shieldActive: {},
  shieldInactive: {
    opacity: 0.3,
  },
  shieldsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  shieldsSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  // Weekly
  weeklyContainer: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  weeklyRow: {
    flexDirection: 'row',
  },
  weeklyItem: {
    flex: 1,
    alignItems: 'center',
  },
  weeklyDivider: {
    width: 1,
    opacity: 0.3,
  },
  weeklyLabel: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  weeklyValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  // Share button
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.pill,
    marginTop: Spacing.xl,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default StreakHubSheet;
