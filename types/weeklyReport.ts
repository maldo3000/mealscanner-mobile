export interface WeeklyReportMetricComparison {
  total?: number;
  avg_per_day?: number;
  target_total?: number;
  total_g?: number;
  avg_per_day_g?: number;
  target_total_g?: number;
  comparison?: string;
}

export interface WeeklyReportNutrientDays {
  over_limit_days: number;
  tracked_days: number;
  threshold_g?: number;
  threshold_mg?: number;
}

export interface WeeklyReportDailyBreakdown {
  date: string;
  meals_count: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g?: number;
  sodium_mg?: number;
}

export interface WeeklyReportMetrics {
  timezone: string;
  window_start_local: string;
  window_end_local: string;
  date_range_label: string;
  logged_days: number;
  calories: WeeklyReportMetricComparison;
  protein: WeeklyReportMetricComparison;
  carbs: WeeklyReportMetricComparison;
  fat: WeeklyReportMetricComparison;
  fiber: WeeklyReportMetricComparison;
  added_sugar_days: WeeklyReportNutrientDays;
  sodium_days: WeeklyReportNutrientDays;
  pattern_signals: {
    low_lunch_protein_high_dinner_calories_days: number;
  };
  daily_breakdown: WeeklyReportDailyBreakdown[];
  goal_context_note: string;
  goal_last_updated_at: string | null;
  protein_target_hit_days?: number;
}

export interface NutritionInsight {
  food: string;
  insight: string;
  why_it_matters: string;
}

export interface FoodCallout {
  ingredient: string;
  verdict: 'positive' | 'negative' | 'neutral';
  explanation: string;
}

export interface WeeklyReportNarrative {
  at_a_glance: Record<string, unknown>;
  top_wins: string[];
  top_drags: string[];
  patterns: string[];
  next_week_plan: string[];
  highest_impact_recommendation: string;
  week_over_week_deltas: string[];
  notes: string[];
  nutrition_insights?: NutritionInsight[];
  food_callouts?: FoodCallout[];
}

export interface WeeklyNutritionReport {
  id: string;
  user_id: string;
  window_start_local: string;
  window_end_local: string;
  timezone: string;
  generated_at: string;
  next_available_at: string;
  logged_days: number;
  metrics_json: WeeklyReportMetrics;
  narrative_json: WeeklyReportNarrative;
  summary_line: string;
  is_insufficient_data: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WeeklyReportGenerationResult {
  success: boolean;
  lockout: boolean;
  next_available_at?: string;
  days_remaining?: number;
  report?: WeeklyNutritionReport;
  latest_report?: WeeklyNutritionReport;
  error?: string;
}
