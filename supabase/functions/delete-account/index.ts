import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifyAuth, createUnauthorizedResponse } from '../_shared/auth.ts';
import { getSmartCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

/**
 * Delete Account Edge Function
 * 
 * Securely deletes a user's account and all associated data.
 * Required for Apple App Store compliance (Guideline 5.1.1).
 * 
 * Flow:
 * 1. Verify JWT authentication
 * 2. Delete user's storage files (required before user deletion)
 * 3. Delete user from auth.users (cascades to all related tables)
 */

interface DeleteAccountResponse {
  success: boolean;
  message?: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  // Get request-aware CORS headers
  const corsHeaders = getSmartCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify JWT authentication first
    const auth = await verifyAuth(req);
    if (!auth) {
      return createUnauthorizedResponse(corsHeaders);
    }

    const userId = auth.userId;
    console.log(`🗑️ Delete account requested for user: ${userId}`);

    // Initialize Supabase client with service role key (required for admin operations)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Step 1: Delete user's storage files first
    // Storage ownership can prevent user deletion, so we clean up files first
    console.log(`🗑️ Cleaning up storage for user: ${userId}`);
    
    // Delete meal images
    try {
      const { data: mealImages } = await supabaseAdmin.storage
        .from('meal-images')
        .list(userId);
      
      if (mealImages && mealImages.length > 0) {
        const filePaths = mealImages.map(file => `${userId}/${file.name}`);
        await supabaseAdmin.storage.from('meal-images').remove(filePaths);
        console.log(`🗑️ Deleted ${filePaths.length} meal images`);
      }

      // Also delete recipe images subfolder
      const { data: recipeImages } = await supabaseAdmin.storage
        .from('meal-images')
        .list(`${userId}/recipes`);
      
      if (recipeImages && recipeImages.length > 0) {
        const recipePaths = recipeImages.map(file => `${userId}/recipes/${file.name}`);
        await supabaseAdmin.storage.from('meal-images').remove(recipePaths);
        console.log(`🗑️ Deleted ${recipePaths.length} recipe images`);
      }
    } catch (storageError) {
      console.warn('⚠️ Error cleaning meal-images storage (continuing):', storageError);
      // Continue with deletion even if storage cleanup fails
    }

    // Delete audio recordings
    try {
      const { data: audioFiles } = await supabaseAdmin.storage
        .from('audio-recordings')
        .list(userId);
      
      if (audioFiles && audioFiles.length > 0) {
        const audioPaths = audioFiles.map(file => `${userId}/${file.name}`);
        await supabaseAdmin.storage.from('audio-recordings').remove(audioPaths);
        console.log(`🗑️ Deleted ${audioPaths.length} audio recordings`);
      }
    } catch (storageError) {
      console.warn('⚠️ Error cleaning audio-recordings storage (continuing):', storageError);
      // Continue with deletion even if storage cleanup fails
    }

    // Step 2: Delete the user from auth.users
    // This will cascade to all related tables:
    // - profiles (CASCADE)
    // - meals (CASCADE)
    // - recipes, recommendations, user_goals (CASCADE from profiles)
    // - ip_blocklist.blocked_by (SET NULL)
    console.log(`🗑️ Deleting user from auth.users: ${userId}`);
    
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('❌ Failed to delete user:', deleteError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to delete account: ${deleteError.message}` 
        } as DeleteAccountResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Successfully deleted user account: ${userId}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account deleted successfully' 
      } as DeleteAccountResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Delete account error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      } as DeleteAccountResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
