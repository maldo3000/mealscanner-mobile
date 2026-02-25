import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

import { createUnauthorizedResponse, validateUserMatch, verifyAuth } from "../_shared/auth.ts";
import { getSmartCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getLLMRouter } from "../_shared/llm/router.ts";
import type { ChatMessage } from "../_shared/llm/types.ts";
import {
  checkRateLimit,
  createRateLimitResponse,
  getRateLimitIdentifier,
  RateLimitPresets,
} from "../_shared/rateLimit.ts";
import {
  createValidationErrorResponse,
  GenerateWeeklyNutritionReportRequestSchema,
  validateRequest,
} from "../_shared/validation.ts";

interface WeeklyReportRequest {
  user_id?: string;
  timezone?: string;
  include_summary?: boolean;
  window_end_local?: string;
}

interface MealRow {
  id: string;
  calories: number | null;
  macros: Record<string, unknown> | null;
  meal_type: string | null;
  created_at: string;
  description: string | null;
  ingredients: string[] | null;
  health_score: string | null;
  qualitative_feedback: string | null;
}

interface FoodHighlight {
  day: string;
  meal_name: string;
  ingredients: string[];
  health_score: string;
  calories: number;
  protein_g: number;
  fiber_g: number;
  qualitative_note: string;
}

interface GoalRow {
  target_calories?: number | null;
  target_protein?: number | null;
  target_carbs?: number | null;
  target_fat?: number | null;
  target_fiber?: number | null;
  updated_at?: string | null;
}

interface WeeklyReportRow {
  id: string;
  generated_at: string;
  next_available_at: string;
  summary_line: string;
  is_insufficient_data: boolean;
  window_start_local: string;
  window_end_local: string;
  timezone: string;
  metrics_json: Record<string, unknown>;
  narrative_json: Record<string, unknown>;
}

interface DailyTotals {
  date: string;
  mealsCount: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  lunchProtein: number;
  dinnerCalories: number;
  sugar: number;
  sodium: number;
}

interface NutritionInsight {
  food: string;
  insight: string;
  why_it_matters: string;
}

interface FoodCallout {
  ingredient: string;
  verdict: "positive" | "negative" | "neutral";
  explanation: string;
}

interface NarrativeJson {
  at_a_glance: Record<string, unknown>;
  top_wins: string[];
  top_drags: string[];
  patterns: string[];
  next_week_plan: string[];
  highest_impact_recommendation: string;
  week_over_week_deltas: string[];
  notes: string[];
  nutrition_insights: NutritionInsight[];
  food_callouts: FoodCallout[];
}

const DAILY_SODIUM_LIMIT_MG = 2300;
const DAILY_ADDED_SUGAR_LIMIT_G = 50;
const LOOKBACK_DAYS_FOR_QUERY = 10;
const LOCKOUT_DAYS = 7;

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function parseJsonObject(input: string): Record<string, unknown> {
  const cleaned = input.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch (error) {
    console.warn("Failed to parse LLM JSON:", error);
  }
  return {};
}

function localDateStringFromUtc(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

function addDays(localDate: string, days: number): string {
  const d = new Date(`${localDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function getSevenDayWindow(endLocalDate: string): string[] {
  const dates: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    dates.push(addDays(endLocalDate, -i));
  }
  return dates;
}

function formatRange(start: string, end: string, timezone: string): string {
  const startDate = new Date(`${start}T00:00:00.000Z`);
  const endDate = new Date(`${end}T00:00:00.000Z`);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
  });
  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

function computeStatusDelta(actual: number, target: number, unitSuffix = ""): string {
  const roundedActual = Math.round(actual * 10) / 10;
  const roundedTarget = Math.round(target * 10) / 10;
  const delta = roundedActual - roundedTarget;
  const sign = delta >= 0 ? "+" : "";
  return `${roundedActual}${unitSuffix} vs ${roundedTarget}${unitSuffix} (${sign}${Math.round(delta * 10) / 10}${unitSuffix})`;
}

function getNarrativeFallback(metrics: Record<string, unknown>, isInsufficient: boolean, highlights: FoodHighlight[]): NarrativeJson {
  // Build fallback nutrition insights from actual food data when available
  const fallbackInsights: NutritionInsight[] = [];
  const fallbackCallouts: FoodCallout[] = [];

  for (const h of highlights.slice(0, 3)) {
    if (h.health_score === "very_healthy" || h.health_score === "healthy") {
      fallbackInsights.push({
        food: h.meal_name || "A meal this week",
        insight: `${h.meal_name} provided ${h.protein_g}g protein and ${h.fiber_g}g fiber.`,
        why_it_matters: "Protein supports muscle recovery and keeps you full, while fiber aids digestion and helps regulate blood sugar.",
      });
    }
    if (h.ingredients.length > 0) {
      const ing = h.ingredients[0]!;
      fallbackCallouts.push({
        ingredient: ing,
        verdict: h.health_score === "needs_improvement" ? "neutral" : "positive",
        explanation: `${ing} appeared in your meals this week — a good source of essential nutrients.`,
      });
    }
    if (fallbackInsights.length >= 2 && fallbackCallouts.length >= 2) break;
  }

  if (isInsufficient) {
    return {
      at_a_glance: metrics,
      top_wins: [
        "You started building the habit by logging meals this week.",
        "You now have baseline data to personalize next week.",
        "Consistency improved whenever you logged multiple meals in one day.",
      ],
      top_drags: [
        "Less than 3 logged days makes nutrition trends unreliable.",
        "Low logging coverage limits accurate goal comparisons.",
        "Inconsistent logging often hides snack and beverage calories.",
      ],
      patterns: [
        "Days with at least two logged meals create better insight quality.",
        "Long gaps between logs reduce actionable feedback.",
      ],
      next_week_plan: [
        "Log at least one meal per day for 5 of 7 days.",
        "Prioritize logging lunch and dinner first for consistency.",
      ],
      highest_impact_recommendation: "Focus on logging consistency first; aim for 5 logged days before chasing macro precision.",
      week_over_week_deltas: [],
      notes: ["Not enough data yet for a full 7-day nutrition analysis."],
      nutrition_insights: fallbackInsights.slice(0, 2),
      food_callouts: fallbackCallouts.slice(0, 2),
    };
  }

  return {
    at_a_glance: metrics,
    top_wins: [
      "You maintained consistent logging across the week.",
      "Your calorie and protein trends are now measurable.",
      "You have enough data for targeted nutrition adjustments.",
    ],
    top_drags: [
      "Some nutrient targets remain under-hit on multiple days.",
      "Meal timing and protein distribution could be tighter.",
      "High-sodium or high-sugar days may be limiting progress.",
    ],
    patterns: ["Pattern detection is available after generation."],
    next_week_plan: [
      "Pre-plan one high-protein lunch option for weekdays.",
      "Set a sodium-aware dinner swap for 3 days this week.",
    ],
    highest_impact_recommendation: "Anchor lunch protein to reduce evening calorie drift.",
    week_over_week_deltas: [],
    notes: [],
    nutrition_insights: fallbackInsights.slice(0, 2),
    food_callouts: fallbackCallouts.slice(0, 2),
  };
}

function safeArray(value: unknown, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .slice(0, maxLen);
}

function safeNutritionInsights(value: unknown, maxLen: number): NutritionInsight[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => v != null && typeof v === "object" && !Array.isArray(v))
    .map((v) => ({
      food: typeof v.food === "string" ? v.food.trim() : "",
      insight: typeof v.insight === "string" ? v.insight.trim() : "",
      why_it_matters: typeof v.why_it_matters === "string" ? v.why_it_matters.trim() : "",
    }))
    .filter((item) => item.food && item.insight)
    .slice(0, maxLen);
}

function safeFoodCallouts(value: unknown, maxLen: number): FoodCallout[] {
  if (!Array.isArray(value)) return [];
  const validVerdicts = new Set(["positive", "negative", "neutral"]);
  return value
    .filter((v): v is Record<string, unknown> => v != null && typeof v === "object" && !Array.isArray(v))
    .map((v) => ({
      ingredient: typeof v.ingredient === "string" ? v.ingredient.trim() : "",
      verdict: (typeof v.verdict === "string" && validVerdicts.has(v.verdict) ? v.verdict : "neutral") as "positive" | "negative" | "neutral",
      explanation: typeof v.explanation === "string" ? v.explanation.trim() : "",
    }))
    .filter((item) => item.ingredient && item.explanation)
    .slice(0, maxLen);
}

Deno.serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getSmartCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return createUnauthorizedResponse(corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const rawBody = await req.json() as WeeklyReportRequest;
    const validation = validateRequest(GenerateWeeklyNutritionReportRequestSchema, rawBody);
    if (!validation.success || !validation.data) {
      return createValidationErrorResponse(validation, corsHeaders);
    }

    const {
      user_id: payloadUserId,
      timezone = "UTC",
      include_summary: includeSummary = true,
      window_end_local: explicitWindowEnd,
    } = validation.data;

    if (payloadUserId && !validateUserMatch(auth.userId, payloadUserId)) {
      return new Response(
        JSON.stringify({ success: false, error: "User ID mismatch: you can only access your own data" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const userId = auth.userId;

    // Backend Pro enforcement: never trust client-side gating.
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .single();
    if (profileError) {
      throw profileError;
    }

    const tier = (profileData as { subscription_tier?: string } | null)?.subscription_tier ?? "free";
    const isProUser = tier === "pro" || tier === "premium";
    if (!isProUser) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Weekly reports are a Pro feature. Upgrade to continue.",
          code: "pro_required",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rateIdentifier = getRateLimitIdentifier(req, userId);
    const rateResult = await checkRateLimit(rateIdentifier, {
      ...RateLimitPresets.weeklyReport,
      keyPrefix: "weekly-report",
    });
    if (!rateResult.allowed) {
      return createRateLimitResponse(rateResult, corsHeaders);
    }

    const { data: latestReportData, error: latestReportError } = await supabase
      .from("weekly_nutrition_reports")
      .select("*")
      .eq("user_id", userId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestReportError) {
      throw latestReportError;
    }

    // --- DEBUG: set DEBUG_BYPASS_REPORT_LOCKOUT=true to allow repeated generation ---
    const debugBypass = Deno.env.get("DEBUG_BYPASS_REPORT_LOCKOUT") === "true";

    const now = new Date();
    if (!debugBypass && latestReportData?.next_available_at) {
      const nextAvailableAt = new Date(latestReportData.next_available_at);
      if (nextAvailableAt > now) {
        const msDiff = nextAvailableAt.getTime() - now.getTime();
        const daysRemaining = Math.max(1, Math.ceil(msDiff / (24 * 60 * 60 * 1000)));
        return new Response(
          JSON.stringify({
            success: false,
            lockout: true,
            next_available_at: latestReportData.next_available_at,
            days_remaining: daysRemaining,
            latest_report: latestReportData,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (debugBypass) {
      console.log("DEBUG: Report lockout bypassed");
    }

    const windowEndLocal = explicitWindowEnd ?? localDateStringFromUtc(now, timezone);
    const dateWindow = getSevenDayWindow(windowEndLocal);
    const windowStartLocal = dateWindow[0]!;
    const daySet = new Set(dateWindow);

    const fetchStart = new Date(now.getTime() - LOOKBACK_DAYS_FOR_QUERY * 24 * 60 * 60 * 1000);
    const { data: mealsData, error: mealsError } = await supabase
      .from("meals")
      .select("id, calories, macros, meal_type, created_at, description, ingredients, health_score, qualitative_feedback")
      .eq("user_id", userId)
      .gte("created_at", fetchStart.toISOString())
      .order("created_at", { ascending: true });

    if (mealsError) {
      throw mealsError;
    }

    const mealRows = ((mealsData ?? []) as MealRow[]).filter((meal) => {
      const localDate = localDateStringFromUtc(new Date(meal.created_at), timezone);
      return daySet.has(localDate);
    });

    const perDay: Record<string, DailyTotals> = {};
    for (const day of dateWindow) {
      perDay[day] = {
        date: day,
        mealsCount: 0,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        lunchProtein: 0,
        dinnerCalories: 0,
        sugar: 0,
        sodium: 0,
      };
    }

    const mealIds = mealRows.map((m) => m.id);
    if (mealIds.length > 0) {
      const { data: mealItemsData } = await supabase
        .from("meal_items")
        .select("meal_id, quantity, ai_nutrition_per_unit")
        .in("meal_id", mealIds);

      for (const mealItem of (mealItemsData ?? []) as Array<Record<string, unknown>>) {
        const mealId = String(mealItem.meal_id ?? "");
        const nutrition = (mealItem.ai_nutrition_per_unit ?? {}) as Record<string, unknown>;
        const quantity = Math.max(1, Math.floor(toNumber(mealItem.quantity)));
        const meal = mealRows.find((m) => m.id === mealId);
        if (!meal) continue;
        const localDate = localDateStringFromUtc(new Date(meal.created_at), timezone);
        if (!perDay[localDate]) continue;
        perDay[localDate].sugar += toNumber(nutrition.sugar) * quantity;
        perDay[localDate].sodium += toNumber(nutrition.sodium) * quantity;
      }
    }

    for (const meal of mealRows) {
      const localDate = localDateStringFromUtc(new Date(meal.created_at), timezone);
      const bucket = perDay[localDate];
      if (!bucket) continue;

      const macros = meal.macros ?? {};
      const protein = toNumber(macros.protein);
      const carbs = toNumber(macros.carbs);
      const fat = toNumber(macros.fat);
      const fiber = toNumber(macros.fiber);
      const calories = toNumber(meal.calories);

      bucket.mealsCount += 1;
      bucket.calories += calories;
      bucket.protein += protein;
      bucket.carbs += carbs;
      bucket.fat += fat;
      bucket.fiber += fiber;

      const mealType = (meal.meal_type ?? "").toLowerCase();
      if (mealType.includes("lunch")) {
        bucket.lunchProtein += protein;
      }
      if (mealType.includes("dinner")) {
        bucket.dinnerCalories += calories;
      }
    }

    // Build food highlights for qualitative analysis
    const foodHighlights: FoodHighlight[] = mealRows
      .filter((m) => m.description || (m.ingredients && m.ingredients.length > 0))
      .map((meal) => {
        const localDate = localDateStringFromUtc(new Date(meal.created_at), timezone);
        const dayFormatter = new Intl.DateTimeFormat("en-US", {
          timeZone: timezone,
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const dayLabel = dayFormatter.format(new Date(meal.created_at));
        const macros = meal.macros ?? {};
        return {
          day: dayLabel,
          meal_name: (meal.description ?? "").slice(0, 80),
          ingredients: (meal.ingredients ?? []).slice(0, 12),
          health_score: meal.health_score ?? "unknown",
          calories: Math.round(toNumber(meal.calories)),
          protein_g: Math.round(toNumber(macros.protein) * 10) / 10,
          fiber_g: Math.round(toNumber(macros.fiber) * 10) / 10,
          qualitative_note: (meal.qualitative_feedback ?? "").slice(0, 120),
        };
      })
      .slice(0, 20); // Cap to keep prompt size reasonable

    const dailyRows = dateWindow.map((d) => perDay[d]);
    const loggedDays = dailyRows.filter((d) => d.mealsCount > 0).length;

    const { data: goalData } = await supabase
      .from("user_goals")
      .select("target_calories, target_protein, target_carbs, target_fat, target_fiber, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const goalRow = (goalData ?? null) as GoalRow | null;

    const targetCaloriesDaily = toNumber(goalRow?.target_calories);
    const targetProteinDaily = toNumber(goalRow?.target_protein);
    const targetCarbsDaily = toNumber(goalRow?.target_carbs);
    const targetFatDaily = toNumber(goalRow?.target_fat);
    const targetFiberDaily = toNumber(goalRow?.target_fiber);

    const caloriesTotal = dailyRows.reduce((sum, day) => sum + day.calories, 0);
    const proteinTotal = dailyRows.reduce((sum, day) => sum + day.protein, 0);
    const carbsTotal = dailyRows.reduce((sum, day) => sum + day.carbs, 0);
    const fatTotal = dailyRows.reduce((sum, day) => sum + day.fat, 0);
    const fiberTotal = dailyRows.reduce((sum, day) => sum + day.fiber, 0);

    const sugarTrackedDays = dailyRows.filter((d) => d.sugar > 0).length;
    const sodiumTrackedDays = dailyRows.filter((d) => d.sodium > 0).length;
    const addedSugarHighDays = dailyRows.filter((d) => d.sugar > DAILY_ADDED_SUGAR_LIMIT_G).length;
    const sodiumHighDays = dailyRows.filter((d) => d.sodium > DAILY_SODIUM_LIMIT_MG).length;

    const lowLunchHighDinnerPatternDays = dailyRows.filter((d) => d.lunchProtein > 0 && d.lunchProtein < 25 && d.dinnerCalories > 900).length;
    const avgCalories = caloriesTotal / 7;
    const avgProtein = proteinTotal / 7;

    const targetScale = 7;
    const metricsJson: Record<string, unknown> = {
      timezone,
      window_start_local: windowStartLocal,
      window_end_local: windowEndLocal,
      date_range_label: formatRange(windowStartLocal, windowEndLocal, timezone),
      logged_days: loggedDays,
      calories: {
        total: Math.round(caloriesTotal),
        avg_per_day: Math.round(avgCalories),
        target_total: Math.round(targetCaloriesDaily * targetScale),
        comparison: computeStatusDelta(caloriesTotal, targetCaloriesDaily * targetScale),
      },
      protein: {
        total_g: Math.round(proteinTotal * 10) / 10,
        avg_per_day_g: Math.round(avgProtein * 10) / 10,
        target_total_g: Math.round(targetProteinDaily * targetScale * 10) / 10,
        comparison: computeStatusDelta(proteinTotal, targetProteinDaily * targetScale, "g"),
      },
      carbs: {
        total_g: Math.round(carbsTotal * 10) / 10,
        target_total_g: Math.round(targetCarbsDaily * targetScale * 10) / 10,
      },
      fat: {
        total_g: Math.round(fatTotal * 10) / 10,
        target_total_g: Math.round(targetFatDaily * targetScale * 10) / 10,
      },
      fiber: {
        total_g: Math.round(fiberTotal * 10) / 10,
        target_total_g: Math.round(targetFiberDaily * targetScale * 10) / 10,
      },
      added_sugar_days: {
        over_limit_days: addedSugarHighDays,
        tracked_days: sugarTrackedDays,
        threshold_g: DAILY_ADDED_SUGAR_LIMIT_G,
      },
      sodium_days: {
        over_limit_days: sodiumHighDays,
        tracked_days: sodiumTrackedDays,
        threshold_mg: DAILY_SODIUM_LIMIT_MG,
      },
      pattern_signals: {
        low_lunch_protein_high_dinner_calories_days: lowLunchHighDinnerPatternDays,
      },
      daily_breakdown: dailyRows.map((d) => ({
        date: d.date,
        meals_count: d.mealsCount,
        calories: Math.round(d.calories),
        protein_g: Math.round(d.protein * 10) / 10,
        carbs_g: Math.round(d.carbs * 10) / 10,
        fat_g: Math.round(d.fat * 10) / 10,
        fiber_g: Math.round(d.fiber * 10) / 10,
        sugar_g: Math.round(d.sugar * 10) / 10,
        sodium_mg: Math.round(d.sodium),
      })),
      goal_context_note:
        "Targets are based on your current active goal. Historical goal changes are not yet versioned per day.",
      goal_last_updated_at: goalRow?.updated_at ?? null,
    };

    const isInsufficientData = loggedDays < 3;

    const { data: previousReportData } = await supabase
      .from("weekly_nutrition_reports")
      .select("metrics_json")
      .eq("user_id", userId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousMetrics = (previousReportData?.metrics_json ?? {}) as Record<string, unknown>;
    const previousProteinTargetDays = toNumber((previousMetrics.protein_target_hit_days as number) ?? 0);
    const currentProteinTargetHitDays = dailyRows.filter((d) => d.protein >= targetProteinDaily && targetProteinDaily > 0).length;
    metricsJson.protein_target_hit_days = currentProteinTargetHitDays;
    const wowDelta = currentProteinTargetHitDays - previousProteinTargetDays;

    let narrativeJson = getNarrativeFallback(metricsJson, isInsufficientData, foodHighlights);
    if (!isInsufficientData && includeSummary) {
      const messages: ChatMessage[] = [
        {
          role: "system",
          content:
            "You are a nutrition coach who teaches as you go. Return strict JSON only. Never invent numbers. Use only numbers from input_metrics_json. When referencing foods, use actual meal names and ingredients from food_highlights. Explain the nutritional science in simple, conversational language.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: [
              "Create a weekly nutrition report with these JSON fields:",
              "- top_wins(3 strings): specific, measurable positives. Reference actual foods from food_highlights by name when possible, and briefly explain WHY they were nutritionally beneficial.",
              "- top_drags(3 strings): specific gaps with numbers and likely sources.",
              "- patterns(2-4 strings): clear correlations spotted in the data.",
              "- next_week_plan(2-4 strings): concrete, trackable steps.",
              "- highest_impact_recommendation(1 string): single most important action.",
              "- summary_line(1 string): one-sentence report summary.",
              "- week_over_week_deltas(optional string array): simple deltas if previous data exists.",
              "- notes(optional string array): any caveats.",
              "- nutrition_insights(2-3 objects): each with {food: string, insight: string, why_it_matters: string}. Pick specific meals/ingredients from food_highlights. 'insight' should name the food and a key nutrient or property. 'why_it_matters' explains the health benefit in 1-2 plain-language sentences (e.g. why omega-3 matters, why fiber keeps you full, why complete proteins help muscle recovery).",
              "- food_callouts(2-3 objects): each with {ingredient: string, verdict: 'positive'|'negative'|'neutral', explanation: string}. Spotlight standout ingredients and give a one-sentence 'here is why' lesson.",
              "No scoring. Keep it educational and encouraging.",
            ].join(" "),
            input_metrics_json: metricsJson,
            food_highlights: foodHighlights,
            required_constraints: [
              "Every bullet references at least one number from input metrics when possible.",
              "nutrition_insights and food_callouts MUST reference actual foods/ingredients from food_highlights, not invented ones.",
              "If sugar/sodium tracked_days are 0, avoid definitive conclusions on those nutrients.",
              "Mention that goal targets are current-goal based, not historical per-day versions.",
              "Keep nutrition science explanations accessible — avoid jargon, use everyday language.",
            ],
          }),
        },
      ];

      try {
        const llm = getLLMRouter();
        const completion = await llm.chatComplete(
          {
            messages,
            max_tokens: 1400,
            temperature: 0.3,
            response_format: { type: "json_object" },
          },
        );

        const parsed = parseJsonObject(completion.content);
        narrativeJson = {
          at_a_glance: metricsJson,
          top_wins: safeArray(parsed.top_wins, 3),
          top_drags: safeArray(parsed.top_drags, 3),
          patterns: safeArray(parsed.patterns, 4),
          next_week_plan: safeArray(parsed.next_week_plan, 4),
          highest_impact_recommendation: typeof parsed.highest_impact_recommendation === "string"
            ? parsed.highest_impact_recommendation.trim()
            : "",
          week_over_week_deltas: safeArray(parsed.week_over_week_deltas, 4),
          notes: safeArray(parsed.notes, 4),
          nutrition_insights: safeNutritionInsights(parsed.nutrition_insights, 3),
          food_callouts: safeFoodCallouts(parsed.food_callouts, 3),
        };
      } catch (llmError) {
        console.warn("Weekly report LLM generation failed, using fallback narrative:", llmError);
      }
    } else if (wowDelta !== 0) {
      narrativeJson.week_over_week_deltas = [`Protein target hit days ${wowDelta > 0 ? "increased" : "decreased"} by ${Math.abs(wowDelta)}.`];
    }

    const summaryLine = (() => {
      if (typeof (narrativeJson as Record<string, unknown>).summary_line === "string") {
        return ((narrativeJson as Record<string, unknown>).summary_line as string).trim().slice(0, 180);
      }
      if (narrativeJson.top_wins.length > 0) {
        return narrativeJson.top_wins[0]!.slice(0, 180);
      }
      if (isInsufficientData) {
        return `Not enough data yet (${loggedDays}/7 days logged). Focus on logging consistency this week.`;
      }
      return `Logged ${loggedDays}/7 days, ${Math.round(caloriesTotal)} kcal total, ${Math.round(proteinTotal)}g protein total.`;
    })();

    const nextAvailableAt = new Date(now.getTime() + LOCKOUT_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const insertPayload = {
      user_id: userId,
      window_start_local: windowStartLocal,
      window_end_local: windowEndLocal,
      timezone,
      generated_at: now.toISOString(),
      next_available_at: nextAvailableAt,
      logged_days: loggedDays,
      metrics_json: metricsJson,
      narrative_json: narrativeJson,
      summary_line: summaryLine,
      is_insufficient_data: isInsufficientData,
    };

    // --- DEBUG: remove existing report for same window to avoid unique constraint ---
    if (debugBypass) {
      await supabase
        .from("weekly_nutrition_reports")
        .delete()
        .eq("user_id", userId)
        .eq("window_start_local", windowStartLocal)
        .eq("window_end_local", windowEndLocal);
    }

    const { data: insertedReport, error: insertError } = await supabase
      .from("weekly_nutrition_reports")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError) {
      throw insertError;
    }

    const report = insertedReport as WeeklyReportRow;
    const daysRemaining = Math.max(1, Math.ceil((new Date(report.next_available_at).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

    return new Response(
      JSON.stringify({
        success: true,
        lockout: true,
        next_available_at: report.next_available_at,
        days_remaining: daysRemaining,
        report,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("generate-weekly-nutrition-report error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: "Failed to generate weekly nutrition report", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
