import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

import { createUnauthorizedResponse, verifyAuth } from "../_shared/auth.ts";
import { getSmartCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import {
  checkRateLimit,
  createRateLimitResponse,
  getRateLimitIdentifier,
} from "../_shared/rateLimit.ts";
import { getLLMRouter } from "../_shared/llm/router.ts";
import type { ChatMessage } from "../_shared/llm/types.ts";
import { logUsage } from "../_shared/usageLog.ts";

// ------------------------------------------------------------------
// Contract types
// ------------------------------------------------------------------

const SUPPORTED_INTENTS = [
  "weekly_summary",
  "grocery_list",
  "analysis_explainer",
  "nutrition_insights",
  "general",
] as const;

type SupportedIntent = (typeof SUPPORTED_INTENTS)[number];

interface DevChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface DevChatRequest {
  messages: DevChatMessage[];
  intentHint?: SupportedIntent;
  focusedMealId?: string;
  daysWindow?: number;
}

// ------------------------------------------------------------------
// Compact context helpers — keep token count low
// ------------------------------------------------------------------

interface CompactMeal {
  id: string;
  description: string;
  calories: number | null;
  macros: Record<string, number> | null;
  health_score: string | null;
  meal_type: string | null;
  ingredients: string[] | null;
  created_at: string;
}

interface CompactGoal {
  goal_type: string;
  target_calories: number | null;
  target_protein: number | null;
  target_carbs: number | null;
  target_fat: number | null;
  target_fiber: number | null;
  dietary_restrictions: string[] | null;
  activity_level: string | null;
}

const CONTEXT_COLUMNS = [
  "id",
  "description",
  "calories",
  "macros",
  "health_score",
  "meal_type",
  "ingredients",
  "created_at",
].join(", ");

const MAX_CONTEXT_MEALS = 50;
const MAX_DAYS_WINDOW = 7;

async function buildContextPack(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  daysWindow: number,
  focusedMealId?: string,
) {
  const windowDays = Math.min(Math.max(1, daysWindow), MAX_DAYS_WINDOW);
  const since = new Date();
  since.setDate(since.getDate() - windowDays);

  const [mealsResult, goalsResult, focusedResult] = await Promise.all([
    supabase
      .from("meals")
      .select(CONTEXT_COLUMNS)
      .eq("user_id", userId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(MAX_CONTEXT_MEALS),
    supabase
      .from("user_goals")
      .select(
        "goal_type, target_calories, target_protein, target_carbs, target_fat, target_fiber, dietary_restrictions, activity_level",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    focusedMealId
      ? supabase
          .from("meals")
          .select("*, meal_items(ai_nutrition_per_unit, ai_ingredients, text, item_type)")
          .eq("id", focusedMealId)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const meals = (mealsResult.data as CompactMeal[] | null) ?? [];
  const goal = (goalsResult.data as CompactGoal | null) ?? null;
  const focusedMeal = focusedResult.data ?? null;

  return { meals, goal, focusedMeal, windowDays };
}

function formatContextForPrompt(context: {
  meals: CompactMeal[];
  goal: CompactGoal | null;
  focusedMeal: Record<string, unknown> | null;
  windowDays: number;
}): string {
  const parts: string[] = [];

  parts.push(`Context window: last ${context.windowDays} day(s), ${context.meals.length} meal(s) found.`);

  if (context.goal) {
    parts.push(`\nUser nutrition goal: ${JSON.stringify(context.goal)}`);
  }

  if (context.meals.length > 0) {
    parts.push("\nRecent meals (newest first):");
    for (const meal of context.meals) {
      const date = new Date(meal.created_at).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      const macroStr = meal.macros
        ? `P:${meal.macros.protein ?? "?"}g C:${meal.macros.carbs ?? "?"}g F:${meal.macros.fat ?? "?"}g`
        : "";
      parts.push(
        `- [${date}] ${meal.description} | ${meal.calories ?? "?"}cal ${macroStr} | ${meal.meal_type ?? ""} | ingredients: ${(meal.ingredients ?? []).slice(0, 8).join(", ")}`,
      );
    }
  }

  if (context.focusedMeal) {
    parts.push(`\nFocused meal detail:\n${JSON.stringify(context.focusedMeal, null, 2)}`);
  }

  return parts.join("\n");
}

// ------------------------------------------------------------------
// System prompt
// ------------------------------------------------------------------

const SYSTEM_PROMPT = `You are the MealScanner Developer Assistant — a helpful, concise nutrition companion.

CAPABILITIES (read-only):
- Summarize the user's nutrition data from the provided context window.
- Generate a grocery list based on ingredients from recent meals.
- Explain why a specific meal was analyzed a certain way (reference AI analysis data).
- Provide nutrition insights, patterns, and suggestions based on logged meals.
- Answer general nutrition questions in the context of the user's data.

RULES:
- You can ONLY read and discuss the user's data. You CANNOT modify meals, goals, or any records.
- If the user asks you to edit, delete, update, or change any data, politely refuse and explain this is a read-only assistant. Say this feature is coming soon.
- Keep answers concise and actionable. Use bullet points or short paragraphs.
- When referencing specific meals, mention the date/time and description so the user can find them.
- If asked about data outside the provided context window, say you only have access to the last 7 days.
- Do not hallucinate meal data. Only reference meals explicitly present in the context.
- At the end of your response, suggest 1-2 relevant follow-up questions the user could ask (prefix them with "You could also ask:").

FORMATTING:
- Use plain text, no markdown headers. Short bullet lists are fine.
- Keep total response under 500 words unless the user asks for more detail.`;

// ------------------------------------------------------------------
// Handler
// ------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  const corsHeaders = getSmartCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const startTime = Date.now();

  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return createUnauthorizedResponse(corsHeaders);
    }

    const rateLimitResult = await checkRateLimit(
      getRateLimitIdentifier(req, auth.userId),
      { maxRequests: 30, windowSeconds: 3600, keyPrefix: "dev-chat-assistant" },
    );
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Dev-mode gate
    const { data: accessRow, error: accessError } = await supabaseAdmin
      .from("internal_access")
      .select("dev_mode_enabled")
      .eq("user_id", auth.userId)
      .maybeSingle();

    if (accessError) {
      console.error("Failed to read internal_access:", accessError);
      return new Response(
        JSON.stringify({ success: false, error: "Could not verify developer access." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const hasDevMode = Boolean(
      (accessRow as { dev_mode_enabled?: boolean } | null)?.dev_mode_enabled,
    );
    if (!hasDevMode) {
      return new Response(
        JSON.stringify({ success: false, error: "Developer mode is not enabled for this account." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse + validate request
    const body = (await req.json()) as DevChatRequest;
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "At least one message is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    if (lastUserMessage.length < 2 || lastUserMessage.length > 2000) {
      return new Response(
        JSON.stringify({ success: false, error: "Message must be between 2 and 2000 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const daysWindow = Math.min(body.daysWindow ?? MAX_DAYS_WINDOW, MAX_DAYS_WINDOW);

    // Build context pack
    const context = await buildContextPack(
      supabaseAdmin,
      auth.userId,
      daysWindow,
      body.focusedMealId,
    );

    const contextBlock = formatContextForPrompt(context);
    console.log(`📋 Context pack: ${context.meals.length} meals, goal=${!!context.goal}, focused=${!!context.focusedMeal}`);

    // Build chat messages for the LLM
    const llmMessages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Here is my nutrition data for context:\n\n${contextBlock}`,
      },
    ];

    // Replay conversation history (up to last 10 turns to keep tokens bounded)
    const recentHistory = messages.slice(-10);
    for (const msg of recentHistory) {
      llmMessages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }

    const llmRouter = getLLMRouter();
    const chatResponse = await llmRouter.chatComplete(
      {
        messages: llmMessages,
        max_tokens: 1500,
        temperature: 0.4,
      },
    );

    const latencyMs = Date.now() - startTime;
    const routing = (chatResponse as { _routing?: { model: string } })._routing;

    logUsage({
      userId: auth.userId,
      functionName: "dev-chat-assistant",
      action: body.intentHint ?? "general",
      model: routing?.model ?? chatResponse.model,
      promptTokens: chatResponse.usage?.prompt_tokens,
      completionTokens: chatResponse.usage?.completion_tokens,
      totalTokens: chatResponse.usage?.total_tokens,
      isPro: true,
    });

    console.log(`✅ dev-chat-assistant responded in ${latencyMs}ms, tokens=${chatResponse.usage?.total_tokens ?? "n/a"}`);

    return new Response(
      JSON.stringify({
        success: true,
        answer: chatResponse.content,
        model: routing?.model ?? chatResponse.model,
        context_summary: {
          meals_count: context.meals.length,
          has_goals: !!context.goal,
          has_focused_meal: !!context.focusedMeal,
          days_window: context.windowDays,
        },
        usage: chatResponse.usage,
        latency_ms: latencyMs,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.error(`❌ dev-chat-assistant error (${latencyMs}ms):`, error);
    return new Response(
      JSON.stringify({ success: false, error: "Unexpected server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
