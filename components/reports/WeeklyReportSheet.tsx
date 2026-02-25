import BottomSheet, { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useTheme } from '@/context/ThemeContext';
import {
    getNotificationSettings,
    syncScheduledNotifications,
    updateWeeklyReportAvailableDate,
} from '@/lib/notifications';
import {
    generateWeeklyNutritionReport,
    getLatestWeeklyNutritionReportStatus,
    getWeeklyNutritionReports,
} from '@/lib/supabase';
import type { WeeklyNutritionReport } from '@/types/weeklyReport';

// --- DEBUG: flip to `true` to bypass 7-day lockout while testing (dev only) ---
// Keep this `false` for normal operation; only toggle manually when needed.
const DEBUG_BYPASS_REPORT_LOCKOUT = false;

import type { ReportGenerationStatus } from './ReportGenerationOverlay';
import { ReportGenerationOverlay } from './ReportGenerationOverlay';
import { WeeklyReportDetailModal } from './WeeklyReportDetailModal';

interface WeeklyReportSheetProps {
  userId: string;
  isPro: boolean;
  onClose: () => void;
  onRequirePro?: () => void;
}

interface ReportStatus {
  hasReport: boolean;
  isLocked: boolean;
  nextAvailableAt: string | null;
  daysRemaining: number;
  latestReport: WeeklyNutritionReport | null;
}

const DEFAULT_STATUS: ReportStatus = {
  hasReport: false,
  isLocked: false,
  nextAvailableAt: null,
  daysRemaining: 0,
  latestReport: null,
};

function toDateRange(report: WeeklyNutritionReport): string {
  const startDate = new Date(`${report.window_start_local}T00:00:00.000Z`);
  const endDate = new Date(`${report.window_end_local}T00:00:00.000Z`);
  const timezone = report.timezone || 'UTC';
  const formatter = new Intl.DateTimeFormat(undefined, { timeZone: timezone, month: 'short', day: 'numeric' });
  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

export const WeeklyReportSheet = forwardRef<BottomSheet, WeeklyReportSheetProps>(
  ({ userId, isPro, onClose, onRequirePro }, ref) => {
    const { tokens } = useTheme();
    const [refreshing, setRefreshing] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [overlayStatus, setOverlayStatus] = useState<ReportGenerationStatus>('idle');
    const [reports, setReports] = useState<WeeklyNutritionReport[]>([]);
    const [status, setStatus] = useState<ReportStatus>(DEFAULT_STATUS);
    const [selectedReport, setSelectedReport] = useState<WeeklyNutritionReport | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const snapPoints = useMemo(() => ['65%', '90%'], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.6}
        />
      ),
      [],
    );

    const refresh = useCallback(async () => {
      if (!userId) return;
      try {
        setRefreshing(true);
        const [statusResult, reportsResult] = await Promise.all([
          getLatestWeeklyNutritionReportStatus(userId),
          getWeeklyNutritionReports(userId),
        ]);

        if (!statusResult.error && statusResult.data) {
          const incoming = statusResult.data as ReportStatus;
          
          // Update notification schedule for weekly report
          await updateWeeklyReportAvailableDate(incoming.nextAvailableAt);
          const settings = await getNotificationSettings();
          await syncScheduledNotifications(settings);

          if (DEBUG_BYPASS_REPORT_LOCKOUT) {
            incoming.isLocked = false;
            incoming.daysRemaining = 0;
          }
          setStatus(incoming);
        }
        if (!reportsResult.error && reportsResult.data) {
          setReports(reportsResult.data);
        }
      } catch (error) {
        console.error('Failed to load weekly reports:', error);
      } finally {
        setRefreshing(false);
      }
    }, [userId]);

    useEffect(() => {
      void refresh();
    }, [refresh]);

    // Clean up success timer on unmount
    useEffect(() => {
      return () => {
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
      };
    }, []);

    const handleGenerate = useCallback(() => {
      if (!isPro) {
        onRequirePro?.();
        return;
      }
      if (status.isLocked && !DEBUG_BYPASS_REPORT_LOCKOUT) return;

      Alert.alert(
        'Generate weekly report',
        'You can generate one report every 7 days. After this report, your next report will unlock in 7 days.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Generate',
            onPress: async () => {
              try {
                setGenerating(true);
                setOverlayStatus('generating');
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
                const result = await generateWeeklyNutritionReport({ userId, timezone, includeSummary: true });
                if (result.error) {
                  throw result.error;
                }
                await refresh();

                // Flash success state briefly before dismissing
                setOverlayStatus('success');
                successTimerRef.current = setTimeout(() => {
                  setOverlayStatus('idle');
                }, 1800);
              } catch (error) {
                console.error('Weekly report generation failed:', error);
                setOverlayStatus('idle');
                Alert.alert('Generation failed', 'Unable to generate your report right now. Please try again.');
              } finally {
                setGenerating(false);
              }
            },
          },
        ],
      );
    }, [isPro, onRequirePro, refresh, status.isLocked, userId]);

    const lockoutText = status.isLocked
      ? `Next report available in ${status.daysRemaining} day${status.daysRemaining === 1 ? '' : 's'}`
      : 'You can generate one report every 7 days';

    return (
      <>
        <BottomSheet
          ref={ref}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: tokens.background }}
          handleIndicatorStyle={{ backgroundColor: tokens.textMuted }}
          onChange={(index) => {
            if (index === -1) {
              onClose();
            } else if (index >= 0) {
              void refresh();
            }
          }}
        >
          <BottomSheetScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Image
                source={require('@/assets/images/nutrition-report_icon.png')}
                style={styles.headerIcon}
              />
              <Text style={[TextStyles.h3, { color: tokens.textPrimary, flex: 1 }]}>Weekly report</Text>
              <TouchableOpacity onPress={() => (ref as React.RefObject<BottomSheet>)?.current?.close()}>
                <IconSymbol name="xmark.circle.fill" size={28} color={tokens.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
              <Text style={[TextStyles.bodySmall, { color: tokens.textMuted }]}>
                Generate a report from your last 7 days of logged meals and goal targets.
              </Text>
              <Text style={[TextStyles.bodySmall, { color: tokens.warning, marginTop: Spacing.xs }]}>
                {lockoutText}
              </Text>

              <Button
                variant="primary"
                fullWidth
                disabled={generating || status.isLocked || !isPro}
                onPress={handleGenerate}
                style={styles.generateButton}
                icon={<IconSymbol name="wand.and.stars" size={16} color={(generating || status.isLocked || !isPro) ? '#1F1F1F' : tokens.textOnAccent} />}
              >
                {!isPro
                  ? 'Upgrade to Pro'
                  : status.isLocked
                    ? `Next report in ${status.daysRemaining}d`
                    : generating
                      ? 'Generating...'
                      : 'Generate report'}
              </Button>
            </View>

            <View style={styles.listHeader}>
              <Text style={[TextStyles.body, { color: tokens.textPrimary }]}>Previous reports</Text>
              <Text style={[TextStyles.caption, { color: tokens.textMuted }]}>{reports.length}</Text>
            </View>

            {reports.length === 0 ? (
              <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
                <Text style={[TextStyles.bodySmall, { color: tokens.textMuted }]}>
                  No reports yet. Generate your first report to get weekly coaching insights.
                </Text>
              </View>
            ) : (
              reports.map((report) => (
                <TouchableOpacity
                  key={report.id}
                  accessibilityLabel={`Open weekly report for ${toDateRange(report)}`}
                  onPress={() => {
                    setSelectedReport(report);
                    setDetailVisible(true);
                  }}
                  style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}
                >
                  <Text style={[TextStyles.body, { color: tokens.textPrimary }]}>{toDateRange(report)}</Text>
                  <Text style={[TextStyles.bodySmall, { color: tokens.textMuted, marginTop: Spacing.xs }]} numberOfLines={2}>
                    {report.summary_line || `Logged ${report.logged_days}/7 days`}
                  </Text>
                </TouchableOpacity>
              ))
            )}

            <View style={{ height: 100 }} />
          </BottomSheetScrollView>
        </BottomSheet>

        <WeeklyReportDetailModal
          visible={detailVisible}
          report={selectedReport}
          onClose={() => {
            setDetailVisible(false);
            setSelectedReport(null);
          }}
        />

        <ReportGenerationOverlay status={overlayStatus} />
      </>
    );
  },
);

WeeklyReportSheet.displayName = 'WeeklyReportSheet';

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.base,
  },
  generateButton: {
    marginTop: Spacing.base,
  },
  listHeader: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default WeeklyReportSheet;
