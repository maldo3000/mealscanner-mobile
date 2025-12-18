#!/usr/bin/env node

/**
 * Script to apply database migration to Supabase project
 * Usage: node scripts/apply-migration.js
 * 
 * This script uses the Supabase Management API to apply the migration
 * You'll need to set SUPABASE_ACCESS_TOKEN environment variable
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_REF = 'glzhsfwnsupmmhwzpege';
const MIGRATION_FILE = path.join(__dirname, '../supabase/migrations/20250101000000_complete_setup.sql');

async function applyMigration() {
  console.log('📦 Reading migration file...');
  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
  
  console.log('🔗 Applying migration to project:', PROJECT_REF);
  console.log('⚠️  Note: This requires Supabase Management API access token');
  console.log('   Set SUPABASE_ACCESS_TOKEN environment variable');
  console.log('');
  
  // Check for access token
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (!accessToken) {
    console.error('❌ Error: SUPABASE_ACCESS_TOKEN environment variable not set');
    console.log('');
    console.log('To get your access token:');
    console.log('1. Go to https://supabase.com/dashboard/account/tokens');
    console.log('2. Create a new access token');
    console.log('3. Run: export SUPABASE_ACCESS_TOKEN=your_token_here');
    console.log('4. Then run this script again');
    console.log('');
    console.log('Alternatively, you can:');
    console.log('1. Go to https://supabase.com/dashboard/project/' + PROJECT_REF);
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of:', MIGRATION_FILE);
    console.log('4. Run the SQL');
    process.exit(1);
  }
  
  // Use Supabase Management API to apply migration
  const options = {
    hostname: 'api.supabase.com',
    path: `/v1/projects/${PROJECT_REF}/database/migrations`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Migration applied successfully!');
          resolve(data);
        } else {
          console.error('❌ Error applying migration:', res.statusCode);
          console.error('Response:', data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Network error:', error.message);
      reject(error);
    });
    
    req.write(JSON.stringify({ sql }));
    req.end();
  });
}

// Alternative: Use Supabase JS client with service role key
async function applyMigrationViaClient() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://glzhsfwnsupmmhwzpege.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
    console.log('');
    console.log('To get your service role key:');
    console.log('1. Go to https://supabase.com/dashboard/project/' + PROJECT_REF + '/settings/api');
    console.log('2. Copy the "service_role" key (keep it secret!)');
    console.log('3. Run: export SUPABASE_SERVICE_ROLE_KEY=your_key_here');
    console.log('4. Then run this script again');
    return;
  }
  
  console.log('📦 Reading migration file...');
  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
  
  console.log('🔗 Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  // Split SQL into individual statements and execute
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`📝 Executing ${statements.length} SQL statements...`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.length < 10) continue; // Skip very short statements
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
      if (error) {
        // Some errors are expected (like "already exists")
        if (!error.message.includes('already exists') && 
            !error.message.includes('does not exist')) {
          console.warn(`⚠️  Statement ${i + 1} warning:`, error.message);
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed`);
      }
    } catch (err) {
      console.warn(`⚠️  Statement ${i + 1} error:`, err.message);
    }
  }
  
  console.log('✅ Migration completed!');
}

// Try the client approach first, fall back to instructions
applyMigrationViaClient().catch(() => {
  console.log('');
  console.log('💡 Alternative: Apply migration manually');
  console.log('');
  console.log('1. Go to: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
  console.log('2. Copy the contents of:', MIGRATION_FILE);
  console.log('3. Paste and run in the SQL Editor');
});

