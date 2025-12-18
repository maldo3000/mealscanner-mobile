# Supabase Setup Instructions

## ⚠️ Important: Project Mismatch Found

Your app is configured to use a **different Supabase project** than the one I'm connected to:

- **App Project** (from `.env`): `glzhsfwnsupmmhwzpege`
- **MCP Connection**: `paksdvynluifbfigbbdh`

## ✅ Solution: Apply Migrations to Correct Project

Since your TestFlight app is using project `glzhsfwnsupmmhwzpege`, you need to apply the database migrations there.

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/glzhsfwnsupmmhwzpege
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20250101000000_complete_setup.sql`
4. Paste and run it in the SQL Editor
5. Verify the setup by running:
   ```sql
   SELECT COUNT(*) FROM profiles;
   SELECT COUNT(*) FROM meals;
   ```

### Option 2: Using Supabase CLI

If you have the Supabase CLI linked to the correct project:

```bash
# Link to the correct project
supabase link --project-ref glzhsfwnsupmmhwzpege

# Apply migrations
supabase db push

# Or apply the specific migration
supabase migration up
```

### Option 3: Update MCP Connection (Optional)

If you want me to help with the correct project, update your Cursor MCP Supabase configuration to point to project `glzhsfwnsupmmhwzpege`.

## 🔍 Verify User Exists

After running the migrations, check if your user exists:

```sql
SELECT id, email, created_at FROM auth.users WHERE email = 'josuemoises.maldonado@gmail.com';
```

If the user exists, the backfill function will automatically create their profile.

## 📝 What the Migration Does

1. ✅ Creates `profiles` table
2. ✅ Creates `meals` table  
3. ✅ Creates `analysis_results` table
4. ✅ Creates `user_goals` table
5. ✅ Creates `recommendations` table
6. ✅ Sets up Row Level Security (RLS) policies
7. ✅ Creates trigger to auto-create profiles on signup
8. ✅ Backfills profiles for existing users
9. ✅ Sets up all necessary indexes and triggers

## 🎯 Next Steps

1. Run the migration in the correct project
2. Verify the user exists and has a profile
3. Try scanning a meal again - it should now appear in the journal!

