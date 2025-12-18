# Apply Migration to Your Supabase Project

Since the MCP connection is pointing to a different project, here are the easiest ways to apply the migration to your app's project (`glzhsfwnsupmmhwzpege`):

## Option 1: Supabase Dashboard (Easiest - Recommended) ⭐

1. **Open SQL Editor**: https://supabase.com/dashboard/project/glzhsfwnsupmmhwzpege/sql/new

2. **Copy the migration**: Open `supabase/migrations/20250101000000_complete_setup.sql` and copy all contents

3. **Paste and Run**: Paste into the SQL Editor and click "Run"

4. **Verify**: Run these queries to verify:
   ```sql
   SELECT COUNT(*) FROM profiles;
   SELECT COUNT(*) FROM meals;
   SELECT id, email FROM auth.users WHERE email = 'josuemoises.maldonado@gmail.com';
   ```

## Option 2: Using Supabase CLI

```bash
# Link to your project (you'll be prompted for database password)
npx supabase link --project-ref glzhsfwnsupmmhwzpege

# Apply the migration
npx supabase db push

# Or apply migrations from the migrations folder
npx supabase migration up
```

## Option 3: Using the Script (Requires Service Role Key)

```bash
# Get your service role key from:
# https://supabase.com/dashboard/project/glzhsfwnsupmmhwzpege/settings/api

# Set it as environment variable
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Run the script
node scripts/apply-migration.js
```

## What the Migration Does

✅ Creates `profiles` table  
✅ Creates `meals` table  
✅ Creates `analysis_results` table  
✅ Creates `user_goals` table  
✅ Creates `recommendations` table  
✅ Sets up Row Level Security (RLS) policies  
✅ Creates trigger to auto-create profiles on signup  
✅ Backfills profiles for existing users  
✅ Sets up all necessary indexes and triggers  

After applying, your user `josuemoises.maldonado@gmail.com` will automatically get a profile, and meals will appear in the journal!

