# Phase 1 Setup Guide: LLM Integration Core Infrastructure

## 🎯 Overview

This guide walks you through setting up the core infrastructure for AI-powered meal analysis in your MealScanner mobile app.

## 📋 Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- OpenAI API account with API key
- Supabase project created
- Node.js and npm/yarn installed

## 🚀 Step-by-Step Implementation

### 1. Install Supabase CLI

```bash
# Install Supabase CLI globally
npm install -g supabase

# Verify installation
supabase --version
```

### 2. Initialize Supabase in Your Project

```bash
# Navigate to your project directory
cd mealscanner-mobile

# Initialize Supabase (if not already done)
supabase init

# Link to your remote Supabase project
supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Apply Database Migrations

```bash
# Apply the AI analysis tables migration
supabase db push

# Or apply manually in Supabase Dashboard > SQL Editor
# Copy the content from supabase/migrations/20241230000001_add_ai_analysis_tables.sql
```

### 4. Set Up Environment Variables

#### Local Development (.env)
Create or update your `.env` file:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# For Edge Functions (will be set separately)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

#### Production Environment Variables (Supabase Dashboard)
Set these in Supabase Dashboard > Settings > Edge Functions > Environment Variables:

```bash
supabase secrets set OPENAI_API_KEY=sk-your-openai-key-here
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 5. Deploy Edge Functions

```bash
# Deploy the image analysis function
supabase functions deploy analyze-meal-image

# Deploy the text analysis function
supabase functions deploy analyze-meal-text

# Check deployment status
supabase functions list
```

### 6. Test Edge Functions

#### Test Image Analysis Function
```bash
# Create a test file: test-image-analysis.js
curl -X POST 'https://your-project.supabase.co/functions/v1/analyze-meal-image' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "imageUrl": "https://example.com/meal-image.jpg",
    "userId": "test-user-id",
    "description": "Grilled chicken with vegetables"
  }'
```

#### Test Text Analysis Function
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/analyze-meal-text' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "description": "Large Caesar salad with grilled chicken and croutons",
    "userId": "test-user-id"
  }'
```

### 7. Update Mobile App Code

The AI analysis functions have been added to `lib/supabase.ts`. You can now use them in your app:

```typescript
import { analyzeImageMeal, analyzeTextMeal } from '@/lib/supabase';

// Analyze an image
const { data, error } = await analyzeImageMeal(
  imageUrl,
  userId,
  mealId,
  'Optional description'
);

// Analyze text description
const { data, error } = await analyzeTextMeal(
  description,
  userId,
  mealId
);
```

### 8. Verify Database Tables

Check that the new tables were created in Supabase Dashboard > Database:

- ✅ `analysis_results` - Stores detailed AI analysis data
- ✅ `user_goals` - User dietary goals and preferences
- ✅ `recommendations` - AI-generated recommendations
- ✅ `meals` table enhanced with AI fields

### 9. Test RLS Policies

Verify Row Level Security is working:

```sql
-- Test in SQL Editor (should only return current user's data)
SELECT * FROM user_goals;
SELECT * FROM recommendations;
SELECT * FROM analysis_results;
```

## 🔧 Configuration Details

### OpenAI API Setup

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an API key with GPT-4 Vision access
3. Add billing information (required for GPT-4)
4. Set monthly usage limits if desired

### Supabase Storage Setup

Ensure your storage bucket for meal images allows the MIME types in Edge Functions:

```sql
-- Update storage bucket policy if needed
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'meal-images';
```

## 🧪 Testing Checklist

### Local Development
- [ ] Database migrations applied successfully
- [ ] Environment variables configured
- [ ] Edge functions deploy without errors
- [ ] Test API calls return expected responses

### Mobile App Integration
- [ ] Image capture triggers analysis
- [ ] Text descriptions get processed
- [ ] Analysis results appear in database
- [ ] Recommendations are generated

### Error Handling
- [ ] Invalid image URLs handled gracefully
- [ ] Empty descriptions return appropriate errors
- [ ] API rate limits handled properly
- [ ] Database constraints enforced

## 🚨 Troubleshooting

### Common Issues

#### 1. Edge Function Deployment Fails
```bash
# Check function logs
supabase functions logs analyze-meal-image

# Verify environment variables
supabase secrets list
```

#### 2. OpenAI API Errors
- Check API key validity
- Verify billing setup
- Ensure GPT-4 Vision access
- Check rate limits

#### 3. Database Permission Errors
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Verify service role permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
```

#### 4. CORS Issues
If testing from web:
```bash
# Check CORS headers in edge function
# Add your domain to allowed origins
```

## 📊 Performance Monitoring

### Key Metrics to Track

1. **Analysis Success Rate**: % of successful analyses
2. **Processing Time**: Average time for image/text analysis
3. **API Costs**: OpenAI API usage and costs
4. **User Engagement**: Frequency of AI analysis usage

### Monitoring Setup

```sql
-- Query for performance metrics
SELECT 
  analysis_type,
  AVG(processing_time_ms) as avg_time,
  COUNT(*) as total_analyses,
  AVG((confidence_scores->>'overall')::float) as avg_confidence
FROM analysis_results 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY analysis_type;
```

## 🔄 Next Steps

After completing Phase 1:

1. **Phase 2**: Enhanced Analysis
   - Multi-provider LLM support
   - Improved confidence scoring
   - Nutrition database integration

2. **Phase 3**: Personalization
   - User goal integration in mobile app
   - Recommendation display
   - Progress tracking

3. **Phase 4**: Advanced Features
   - Batch processing
   - Recipe generation
   - Social features

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Supabase function logs
3. Verify all environment variables
4. Ensure API keys are valid and have proper permissions

---

🎉 **Congratulations!** You've successfully implemented Phase 1 of the LLM integration system. Your MealScanner app now has AI-powered meal analysis capabilities! 