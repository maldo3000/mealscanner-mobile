import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

import { createUnauthorizedResponse, verifyAuth } from "../_shared/auth.ts";
import { getSmartCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const PRO_ENTITLEMENT_ID = "MealScanner Pro";

interface RevenueCatEntitlement {
  expires_date?: string | null;
}

interface RevenueCatSubscriberResponse {
  subscriber?: {
    entitlements?: Record<string, RevenueCatEntitlement>;
  };
}

function hasActiveEntitlement(
  entitlements: Record<string, RevenueCatEntitlement> | undefined,
  entitlementId: string,
): boolean {
  if (!entitlements) return false;

  const entitlement = entitlements[entitlementId];
  if (!entitlement) return false;

  // RevenueCat may return null for lifetime purchases.
  if (!entitlement.expires_date) return true;

  const expiresAt = new Date(entitlement.expires_date);
  if (Number.isNaN(expiresAt.getTime())) return false;
  return expiresAt.getTime() > Date.now();
}

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

    const revenueCatSecretKey = Deno.env.get("REVENUECAT_SECRET_KEY");
    if (!revenueCatSecretKey) {
      return new Response(
        JSON.stringify({ success: false, error: "RevenueCat secret is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const encodedUserId = encodeURIComponent(auth.userId);
    const revenueCatResponse = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodedUserId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${revenueCatSecretKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!revenueCatResponse.ok) {
      const bodyText = await revenueCatResponse.text();
      console.error("RevenueCat lookup failed:", {
        status: revenueCatResponse.status,
        body: bodyText.slice(0, 500),
      });

      return new Response(
        JSON.stringify({ success: false, error: "Failed to verify subscription status" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rcData = await revenueCatResponse.json() as RevenueCatSubscriberResponse;
    const hasPro = hasActiveEntitlement(rcData.subscriber?.entitlements, PRO_ENTITLEMENT_ID);
    const nextTier = hasPro ? "pro" : "free";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ subscription_tier: nextTier })
      .eq("id", auth.userId);

    if (updateError) {
      console.error("Failed to update subscription tier:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to sync subscription tier" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: auth.userId,
        subscription_tier: nextTier,
        is_pro: hasPro,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("sync-subscription-tier error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: "Unexpected server error", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
