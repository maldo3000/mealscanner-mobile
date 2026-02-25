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

type SupabaseAdminClient = ReturnType<typeof createClient>;

interface StorageObject {
  name: string;
  id?: string | null;
}

async function listFilesRecursively(
  supabaseAdmin: SupabaseAdminClient,
  bucket: string,
  rootPrefix: string,
): Promise<string[]> {
  const files: string[] = [];
  const pendingPrefixes: string[] = [rootPrefix];
  const pageSize = 100;
  const maxPrefixes = 10000; // Safety guard against runaway recursion
  let visitedPrefixes = 0;

  while (pendingPrefixes.length > 0) {
    const currentPrefix = pendingPrefixes.shift();
    if (!currentPrefix) break;

    visitedPrefixes += 1;
    if (visitedPrefixes > maxPrefixes) {
      throw new Error(`Storage traversal exceeded ${maxPrefixes} prefixes in bucket "${bucket}"`);
    }

    let offset = 0;
    while (true) {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .list(currentPrefix, { limit: pageSize, offset });

      if (error) {
        throw new Error(`Failed to list storage path "${bucket}/${currentPrefix}": ${error.message}`);
      }

      const entries = (data ?? []) as StorageObject[];
      if (entries.length === 0) break;

      for (const entry of entries) {
        if (!entry?.name) continue;
        const childPath = `${currentPrefix}/${entry.name}`;
        const isFolder = entry.id === null;

        if (isFolder) {
          pendingPrefixes.push(childPath);
        } else {
          files.push(childPath);
        }
      }

      if (entries.length < pageSize) break;
      offset += pageSize;
    }
  }

  return files;
}

async function removeFilesInChunks(
  supabaseAdmin: SupabaseAdminClient,
  bucket: string,
  paths: string[],
): Promise<void> {
  const chunkSize = 100;
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const { error } = await supabaseAdmin.storage.from(bucket).remove(chunk);
    if (error) {
      throw new Error(`Failed removing files from "${bucket}": ${error.message}`);
    }
  }
}

async function deleteUserStoragePrefix(
  supabaseAdmin: SupabaseAdminClient,
  bucket: string,
  userId: string,
): Promise<number> {
  const files = await listFilesRecursively(supabaseAdmin, bucket, userId);
  if (files.length === 0) return 0;

  await removeFilesInChunks(supabaseAdmin, bucket, files);
  return files.length;
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

    // Step 1: Delete user's storage files first.
    // If cleanup fails, abort account deletion to avoid orphaned user data.
    console.log(`🗑️ Cleaning up storage for user: ${userId}`);

    const deletedMealImageCount = await deleteUserStoragePrefix(supabaseAdmin, 'meal-images', userId);
    const deletedAudioCount = await deleteUserStoragePrefix(supabaseAdmin, 'audio-recordings', userId);
    console.log(`🗑️ Deleted ${deletedMealImageCount} files from meal-images`);
    console.log(`🗑️ Deleted ${deletedAudioCount} files from audio-recordings`);

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
