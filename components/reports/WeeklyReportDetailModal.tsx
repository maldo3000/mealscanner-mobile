import React from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Spacing } from '@/constants/Spacing';
import { FontFamilies, TextStyles } from '@/constants/Typography';
import { useTheme } from '@/context/ThemeContext';
import type { FoodCallout, NutritionInsight, WeeklyNutritionReport } from '@/types/weeklyReport';

interface WeeklyReportDetailModalProps {
  visible: boolean;
  onClose: () => void;
  report: WeeklyNutritionReport | null;
}

function getNestedRecord(source: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = source[key];
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function getStringValue(source: Record<string, unknown>, key: string, fallback = 'N/A'): string {
  const value = source[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

function renderList(items: string[], textColor: string, mutedColor: string) {
  if (items.length === 0) {
    return <Text style={[TextStyles.bodySmall, { color: mutedColor }]}>No items yet.</Text>;
  }

  return items.map((item) => (
    <View key={item} style={styles.bulletRow}>
      <Text style={[styles.bulletDot, { color: textColor }]}>•</Text>
      <Text style={[TextStyles.bodySmall, { color: textColor, flex: 1 }]}>{item}</Text>
    </View>
  ));
}

export function WeeklyReportDetailModal({ visible, onClose, report }: WeeklyReportDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();

  if (!report) {
    return null;
  }

  const narrative = report.narrative_json;
  const metrics = report.metrics_json;
  const calories = getNestedRecord(metrics as Record<string, unknown>, 'calories');
  const protein = getNestedRecord(metrics as Record<string, unknown>, 'protein');
  const fiber = getNestedRecord(metrics as Record<string, unknown>, 'fiber');
  const addedSugarDays = getNestedRecord(metrics as Record<string, unknown>, 'added_sugar_days');
  const sodiumDays = getNestedRecord(metrics as Record<string, unknown>, 'sodium_days');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: tokens.background, paddingTop: insets.top + Spacing.md }]}>
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/nutrition-report_icon.png')}
              style={styles.headerIcon}
            />
            <View style={{ flex: 1 }}>
              <Text style={[TextStyles.h3, { color: tokens.textPrimary }]}>Weekly nutrition report</Text>
              <Text style={[TextStyles.bodySmall, { color: tokens.textMuted }]}>
                {String(metrics.date_range_label || `${report.window_start_local} - ${report.window_end_local}`)}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityLabel="Close weekly report details"
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: tokens.glassSurface, borderColor: tokens.glassBorder }]}
            >
              <IconSymbol name="xmark" size={20} color={tokens.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
              <Text style={[TextStyles.body, { color: tokens.textPrimary, fontFamily: FontFamilies.headingBold }]}>At-a-glance</Text>
              <Text style={[TextStyles.bodySmall, { color: tokens.textMuted, marginTop: Spacing.xs }]}>
                <Text style={{ fontWeight: '700' }}>Logged days:</Text> {String(metrics.logged_days || 0)}/7
              </Text>
              <Text style={[TextStyles.bodySmall, { color: tokens.textMuted }]}>
                <Text style={{ fontWeight: '700' }}>Calories:</Text> {getStringValue(calories, 'comparison')}
              </Text>
              <Text style={[TextStyles.bodySmall, { color: tokens.textMuted }]}>
                <Text style={{ fontWeight: '700' }}>Protein:</Text> {getStringValue(protein, 'comparison')}
              </Text>
              <Text style={[TextStyles.bodySmall, { color: tokens.textMuted }]}>
                <Text style={{ fontWeight: '700' }}>Fiber total:</Text> {getStringValue(fiber, 'total_g', '0')}g
              </Text>
              <Text style={[TextStyles.bodySmall, { color: tokens.textMuted }]}>
                <Text style={{ fontWeight: '700' }}>Added sugar high days:</Text> {getStringValue(addedSugarDays, 'over_limit_days', '0')}
              </Text>
              <Text style={[TextStyles.bodySmall, { color: tokens.textMuted }]}>
                <Text style={{ fontWeight: '700' }}>Sodium high days:</Text> {getStringValue(sodiumDays, 'over_limit_days', '0')}
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
              <Text style={[TextStyles.body, { color: tokens.textPrimary, fontFamily: FontFamilies.headingBold }]}>Top wins</Text>
              <View style={styles.list}>{renderList(narrative.top_wins || [], tokens.textPrimary, tokens.textMuted)}</View>
            </View>

            {/* Nutrition Highlights — qualitative food-level insights */}
            {(narrative.nutrition_insights?.length ?? 0) > 0 && (
              <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
                <View style={styles.sectionTitleRow}>
                  <IconSymbol name="lightbulb.fill" size={18} color={tokens.accent} />
                  <Text style={[TextStyles.body, { color: tokens.textPrimary, fontFamily: FontFamilies.headingBold }]}>Nutrition Highlights</Text>
                </View>
                <Text style={[TextStyles.caption, { color: tokens.textMuted, marginTop: 2, marginBottom: Spacing.sm }]}>
                  What you ate well this week and why it matters
                </Text>
                <View style={styles.insightsList}>
                  {(narrative.nutrition_insights as NutritionInsight[]).map((item, idx) => (
                    <View
                      key={`insight-${idx}-${item.food}`}
                      style={[styles.insightCard, { backgroundColor: tokens.glassSurface, borderColor: tokens.glassBorder }]}
                    >
                      <Text style={[TextStyles.bodySmall, { color: tokens.accent, fontWeight: '700' }]} numberOfLines={1}>
                        {item.food}
                      </Text>
                      <Text style={[TextStyles.bodySmall, { color: tokens.textPrimary, marginTop: 2 }]}>
                        {item.insight}
                      </Text>
                      <Text style={[TextStyles.caption, { color: tokens.textMuted, marginTop: 4, fontStyle: 'italic' }]}>
                        {item.why_it_matters}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Food Spotlight — ingredient-level callouts */}
            {(narrative.food_callouts?.length ?? 0) > 0 && (
              <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
                <View style={styles.sectionTitleRow}>
                  <IconSymbol name="star.fill" size={18} color={tokens.accent} />
                  <Text style={[TextStyles.body, { color: tokens.textPrimary, fontFamily: FontFamilies.headingBold }]}>Food Spotlight</Text>
                </View>
                <View style={styles.list}>
                  {(narrative.food_callouts as FoodCallout[]).map((item, idx) => (
                    <View key={`callout-${idx}-${item.ingredient}`} style={styles.calloutRow}>
                      <View style={[
                        styles.verdictBadge,
                        {
                          backgroundColor: item.verdict === 'positive'
                            ? `${tokens.accent}20`
                            : item.verdict === 'negative'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : `${tokens.textMuted}15`,
                        },
                      ]}>
                        <Text style={[styles.verdictEmoji]}>
                          {item.verdict === 'positive' ? '+' : item.verdict === 'negative' ? '-' : '~'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[TextStyles.bodySmall, { color: tokens.textPrimary, fontWeight: '600' }]}>
                          {item.ingredient}
                        </Text>
                        <Text style={[TextStyles.caption, { color: tokens.textMuted, marginTop: 1 }]}>
                          {item.explanation}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
              <Text style={[TextStyles.body, { color: tokens.textPrimary, fontFamily: FontFamilies.headingBold }]}>Top drags</Text>
              <View style={styles.list}>{renderList(narrative.top_drags || [], tokens.textPrimary, tokens.textMuted)}</View>
            </View>

            <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
              <Text style={[TextStyles.body, { color: tokens.textPrimary, fontFamily: FontFamilies.headingBold }]}>Patterns</Text>
              <View style={styles.list}>{renderList(narrative.patterns || [], tokens.textPrimary, tokens.textMuted)}</View>
            </View>

            <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
              <Text style={[TextStyles.body, { color: tokens.textPrimary, fontFamily: FontFamilies.headingBold }]}>Next week plan</Text>
              <View style={styles.list}>{renderList(narrative.next_week_plan || [], tokens.textPrimary, tokens.textMuted)}</View>
              {!!narrative.highest_impact_recommendation && (
                <View style={[styles.highlightBox, { backgroundColor: tokens.glassSurface, borderColor: tokens.glassHighlight }]}>
                  <Text style={[TextStyles.bodySmall, { color: tokens.textMuted }]}>Highest-impact recommendation</Text>
                  <Text style={[TextStyles.body, { color: tokens.textPrimary }]}>
                    {narrative.highest_impact_recommendation}
                  </Text>
                </View>
              )}
            </View>

            {(narrative.week_over_week_deltas?.length ?? 0) > 0 && (
              <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
                <Text style={[TextStyles.body, { color: tokens.textPrimary, fontFamily: FontFamilies.headingBold }]}>Week-over-week deltas</Text>
                <View style={styles.list}>
                  {renderList(narrative.week_over_week_deltas || [], tokens.textPrimary, tokens.textMuted)}
                </View>
              </View>
            )}

            <View style={[styles.card, { backgroundColor: tokens.surface1, borderColor: tokens.border }]}>
              <Text style={[TextStyles.bodySmall, { color: tokens.textMuted }]}>
                {String(metrics.goal_context_note || '')}
              </Text>
            </View>

            <View style={{ height: 80 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.base,
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: Spacing.md,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.base,
  },
  list: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  bulletDot: {
    marginTop: 1,
    width: 12,
    textAlign: 'center',
  },
  highlightBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.sm,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  insightsList: {
    gap: Spacing.sm,
  },
  insightCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.sm,
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  verdictBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  verdictEmoji: {
    fontSize: 14,
    fontWeight: '700',
  },
});

