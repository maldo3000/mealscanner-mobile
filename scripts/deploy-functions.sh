#!/bin/bash

# MealScanner Mobile - Edge Functions Deployment Script
# This script deploys Supabase Edge Functions for AI meal analysis

set -e  # Exit on any error

echo "🚀 MealScanner Edge Functions Deployment"
echo "========================================"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're linked to a Supabase project
if [ ! -f ".supabase/config.toml" ]; then
    echo "❌ No Supabase project linked. Please run:"
    echo "   supabase link --project-ref YOUR_PROJECT_REF"
    exit 1
fi

echo "✅ Supabase CLI found"

# Verify required environment variables
echo "🔍 Checking environment variables..."

# Check if required secrets are set (this will be done in Supabase dashboard)
echo "⚠️  Make sure these environment variables are set in Supabase Dashboard:"
echo "   - OPENAI_API_KEY"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo ""

# Deploy database migrations first
echo "📊 Applying database migrations..."
if supabase db push; then
    echo "✅ Database migrations applied successfully"
else
    echo "❌ Failed to apply database migrations"
    exit 1
fi

# Deploy Edge Functions
echo "🔧 Deploying Edge Functions..."

# Deploy analyze-meal-image function
echo "📸 Deploying analyze-meal-image function..."
if supabase functions deploy analyze-meal-image; then
    echo "✅ analyze-meal-image deployed successfully"
else
    echo "❌ Failed to deploy analyze-meal-image function"
    exit 1
fi

# Deploy analyze-meal-text function
echo "📝 Deploying analyze-meal-text function..."
if supabase functions deploy analyze-meal-text; then
    echo "✅ analyze-meal-text deployed successfully"
else
    echo "❌ Failed to deploy analyze-meal-text function"
    exit 1
fi

# Deploy speech-to-text-direct function
echo "🎤 Deploying speech-to-text-direct function..."
if supabase functions deploy speech-to-text-direct; then
    echo "✅ speech-to-text-direct deployed successfully"
else
    echo "❌ Failed to deploy speech-to-text-direct function"
    exit 1
fi

# List deployed functions
echo "📋 Listing deployed functions..."
supabase functions list

# Test connectivity (optional)
echo ""
echo "🧪 Testing function connectivity..."
echo "You can test the functions using:"
echo ""
echo "curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/analyze-meal-image' \\"
echo "  -H 'Authorization: Bearer YOUR_ANON_KEY' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"imageUrl\": \"test\", \"userId\": \"test\"}'"
echo ""

echo "🎉 Deployment completed successfully!"
echo ""
echo "🔧 Next steps:"
echo "1. Set environment variables in Supabase Dashboard"
echo "2. Test the functions with real data"
echo "3. Update your mobile app to use the new AI analysis features"
echo ""
echo "📖 See docs/SETUP_PHASE1.md for detailed setup instructions" 