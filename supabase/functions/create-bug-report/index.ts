import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

import { createUnauthorizedResponse, verifyAuth } from "../_shared/auth.ts";
import { getSmartCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { checkRateLimit, createRateLimitResponse, getRateLimitIdentifier } from "../_shared/rateLimit.ts";

const ALLOWED_SEVERITIES = ["low", "medium", "high", "critical"] as const;
type BugSeverity = (typeof ALLOWED_SEVERITIES)[number];

interface CreateBugReportRequest {
  title: string;
  description: string;
  steps_to_reproduce?: string;
  expected_behavior?: string;
  actual_behavior?: string;
  severity?: BugSeverity;
  app_version?: string;
  platform?: string;
  metadata?: Record<string, unknown>;
}

const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

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

  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return createUnauthorizedResponse(corsHeaders);
    }

    const rateLimitResult = await checkRateLimit(
      getRateLimitIdentifier(req, auth.userId),
      { maxRequests: 20, windowSeconds: 3600, keyPrefix: "create-bug-report" },
    );
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const body = await req.json() as CreateBugReportRequest;
    const title = normalizeText(body.title);
    const description = normalizeText(body.description);
    const stepsToReproduce = normalizeText(body.steps_to_reproduce);
    const expectedBehavior = normalizeText(body.expected_behavior);
    const actualBehavior = normalizeText(body.actual_behavior);
    const severity = (body.severity && ALLOWED_SEVERITIES.includes(body.severity))
      ? body.severity
      : "medium";
    const appVersion = normalizeText(body.app_version);
    const platform = normalizeText(body.platform);
    const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : null;

    if (title.length < 3 || title.length > 120) {
      return new Response(
        JSON.stringify({ success: false, error: "Title must be between 3 and 120 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (description.length < 10 || description.length > 5000) {
      return new Response(
        JSON.stringify({ success: false, error: "Description must be between 10 and 5000 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

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

    const hasDevModeEnabled = Boolean((accessRow as { dev_mode_enabled?: boolean } | null)?.dev_mode_enabled);
    if (!hasDevModeEnabled) {
      return new Response(
        JSON.stringify({ success: false, error: "Developer mode is not enabled for this account." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: report, error: insertError } = await supabaseAdmin
      .from("bug_reports")
      .insert({
        user_id: auth.userId,
        title,
        description,
        steps_to_reproduce: stepsToReproduce || null,
        expected_behavior: expectedBehavior || null,
        actual_behavior: actualBehavior || null,
        severity,
        app_version: appVersion || null,
        platform: platform || null,
        metadata,
        source: "in_app_dev_mode",
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      console.error("Failed to insert bug report:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Could not save bug report." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        bug_report_id: report.id,
        created_at: report.created_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("create-bug-report error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Unexpected server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
