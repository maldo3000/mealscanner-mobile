import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { verifyAuth, createUnauthorizedResponse } from '../_shared/auth.ts';
import { getSmartCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import { checkRateLimit, getRateLimitIdentifier, createRateLimitResponse } from '../_shared/rateLimit.ts';

const VALID_TOPICS = [
  'Scan not working',
  'Subscription / Billing',
  'Account issue',
  'Apple Health sync',
  'Nutrition goals',
  'Feature request',
  'Bug report',
  'Other',
] as const;

type SupportTopic = typeof VALID_TOPICS[number];

interface SupportEmailRequest {
  topic: SupportTopic;
  subject: string;
  message: string;
}

interface SupportEmailResponse {
  success: boolean;
  error?: string;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getSmartCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' } satisfies SupportEmailResponse),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return createUnauthorizedResponse(corsHeaders);
    }

    const rateLimitResult = await checkRateLimit(
      getRateLimitIdentifier(req, auth.userId),
      { maxRequests: 3, windowSeconds: 3600, keyPrefix: 'support-email' }
    );
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, corsHeaders);
    }

    const body: SupportEmailRequest = await req.json();

    if (!body.topic || !VALID_TOPICS.includes(body.topic)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or missing topic' } satisfies SupportEmailResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!body.message || body.message.trim().length < 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message must be at least 10 characters' } satisfies SupportEmailResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (body.message.length > 5000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Message must be under 5000 characters' } satisfies SupportEmailResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const recipientEmail = Deno.env.get('SUPPORT_RECIPIENT_EMAIL');

    if (!resendApiKey || !recipientEmail) {
      console.error('❌ Missing RESEND_API_KEY or SUPPORT_RECIPIENT_EMAIL secret');
      return new Response(
        JSON.stringify({ success: false, error: 'Support email is not configured' } satisfies SupportEmailResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailSubject = body.topic === 'Other' && body.subject?.trim()
      ? `[MealScanner Support][${body.topic}] ${body.subject.trim()}`
      : `[MealScanner Support][${body.topic}]`;

    const sanitize = (str: string) =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">New Support Request</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 12px; background: #f5f5f5; font-weight: 600; width: 120px;">Topic</td>
            <td style="padding: 8px 12px; background: #f5f5f5;">${sanitize(body.topic)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: 600;">User Email</td>
            <td style="padding: 8px 12px;">${sanitize(auth.email || 'N/A')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f5f5f5; font-weight: 600;">User ID</td>
            <td style="padding: 8px 12px; background: #f5f5f5; font-size: 12px;">${sanitize(auth.userId)}</td>
          </tr>
        </table>
        <div style="padding: 16px; background: #fafafa; border-left: 4px solid #4ade80; border-radius: 4px;">
          <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${sanitize(body.message)}</p>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">
          Sent via MealScanner in-app support
        </p>
      </div>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MealScanner Support <support@mail.mealscanner.app>',
        to: [recipientEmail],
        reply_to: auth.email || undefined,
        subject: emailSubject,
        html: htmlBody,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error('❌ Resend API error:', resendResponse.status, resendError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send support email' } satisfies SupportEmailResponse),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Support email sent for user ${auth.userId} — topic: ${body.topic}`);

    return new Response(
      JSON.stringify({ success: true } satisfies SupportEmailResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Send support email error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

    return new Response(
      JSON.stringify({ success: false, error: errorMessage } satisfies SupportEmailResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
