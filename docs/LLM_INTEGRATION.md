# MealScanner LLM Integration & Meal Analysis Documentation

## 🎯 Overview

The MealScanner LLM Integration system provides automated nutrition analysis for meals through image recognition and text description processing. This system leverages Supabase Edge Functions to integrate with modern LLM APIs through a unified router that supports multiple providers (OpenAI, OpenRouter) and models. The router enables flexible model switching while maintaining backward compatibility with existing functionality.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Mobile App    │───▶│ Supabase Edge   │───▶│  LLM Router │───▶│   LLM APIs      │
│   (React Native)│    │   Functions     │    │  (Provider   │    │ (OpenAI/        │
└─────────────────┘    └─────────────────┘    │   Selection) │    │  OpenRouter)    │
        │                       │            └──────────────┘    └─────────────────┘
        │              ┌─────────────────┐
        └─────────────▶│   Supabase      │
                       │   Database      │
                       └─────────────────┘
```

## 📋 Core Features

### 1. Image Analysis (`analyze-meal-image`)
- **Input**: Meal photo URL, user context, optional description
- **Processing**: GPT-4 Vision API analysis
- **Output**: Nutrition breakdown, ingredients, serving size, health score
- **Reliability**: Comprehensive nutrition analysis

### 2. Text Analysis (`analyze-meal-text`)
- **Input**: Written meal description
- **Processing**: GPT-4 Turbo text analysis
- **Output**: Nutrition estimation, ingredient identification, recommendations
- **Personalization**: Tailored advice based on user goals

### 3. Goal-Based Recommendations
- **User Profiling**: Dietary goals, restrictions, activity level
- **Smart Recommendations**: Portion adjustments, timing suggestions, alternatives
- **Progress Tracking**: Historical analysis and trend identification

## 🗄️ Database Schema

### Enhanced Tables

#### `meals` (Enhanced)
```sql
-- Existing fields plus:
ai_analysis JSONB              -- Complete AI analysis result
analysis_version TEXT          -- Version tracking for analysis updates
processing_status TEXT         -- 'pending', 'analyzing', 'completed', 'failed'
```

#### `analysis_results` (New)
```sql
CREATE TABLE analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL, -- 'image', 'text', 'combined'
  raw_response JSONB,          -- Full LLM response
  extracted_nutrition JSONB,   -- Parsed nutrition data
  processing_time_ms INTEGER,  -- Performance tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `user_goals` (New)
```sql
CREATE TABLE user_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL,     -- 'weight_loss', 'muscle_gain', 'maintenance', 'health'
  target_calories INTEGER,
  target_protein REAL,
  target_carbs REAL,
  target_fat REAL,
  target_fiber REAL,
  dietary_restrictions TEXT[], -- Array of restrictions
  activity_level TEXT,         -- 'sedentary', 'light', 'moderate', 'active', 'very_active'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `recommendations` (New)
```sql
CREATE TABLE recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL, -- 'nutrition', 'portion', 'timing', 'alternative'
  content TEXT NOT NULL,
  priority INTEGER DEFAULT 1,       -- 1=low, 2=medium, 3=high
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🚀 API Functions

### Edge Function: `analyze-meal-image`

**Endpoint**: `POST /functions/v1/analyze-meal-image`

**Request Body**:
```typescript
{
  imageUrl: string,        // Public URL to meal image
  userId: string,          // User UUID
  mealId?: string,         // Optional meal ID to update
  description?: string,    // Optional user description
  llm?: {                  // Optional LLM provider/model override
    provider?: 'openai' | 'openrouter',
    model?: string         // Model name (e.g., 'gpt-4-vision-preview' or 'openai/gpt-4o')
  }
}
```

**Response**:
```typescript
{
  success: boolean,
  analysis: {
    nutrition: {
      calories: number,
      protein: number,
      carbs: number,
      fat: number,
      fiber: number
    },
    ingredients: string[],
    serving_size: string,
    health_score: number,    // 1-10 rating
    feedback: string,        // Qualitative assessment
    recommendations: [{
      type: string,
      content: string,
      priority: number
    }]
  },
  analysis_id: string
}
```

### Edge Function: `analyze-meal-text`

**Endpoint**: `POST /functions/v1/analyze-meal-text`

**Request Body**:
```typescript
{
  description: string,     // Meal description
  userId: string,          // User UUID
  mealId?: string,         // Optional meal ID to update
  llm?: {                  // Optional LLM provider/model override
    provider?: 'openai' | 'openrouter',
    model?: string         // Model name (e.g., 'gpt-4-turbo-preview' or 'openai/gpt-4o')
  }
}
```

**Response**: Same format as image analysis

## 🎯 LLM Prompt Engineering

### Image Analysis Prompt Structure
```
As a professional nutritionist, analyze this meal image and provide detailed nutrition information.

[User Description: "{description}"] (if provided)
[User Goals: {userGoals}] (if available)

Please provide a JSON response with:
1. Detailed nutrition breakdown (calories, macros, fiber)
2. Identified ingredients and food items
3. Estimated serving size
4. Health assessment (1-10 scale)
5. Personalized recommendations based on user goals

Format the response as valid JSON with specific numeric values.
```

### Text Analysis Prompt Structure
```
As a professional nutritionist, analyze the following meal description:

Meal Description: "{description}"
User's Health Goals: {userGoals}

Provide comprehensive analysis in JSON format including:
- Nutrition breakdown with specific values
- Identified ingredients
- Serving size estimation
- Health score (1-10)
- Qualitative feedback
- Actionable recommendations
- Missing information that would improve accuracy
```

## 📱 Mobile App Integration

### New Functions in `lib/supabase.ts`

```typescript
// AI Analysis Functions
export const analyzeImageMeal = async (imageUrl: string, userId: string, mealId?: string, description?: string)
export const analyzeTextMeal = async (description: string, userId: string, mealId?: string)

// User Goals Management
export const saveUserGoals = async (userId: string, goals: UserGoals)
export const getUserGoals = async (userId: string)

// Recommendations
export const getUserRecommendations = async (userId: string, limit?: number)
export const markRecommendationAsRead = async (recommendationId: string)

// Analysis Results
export const getAnalysisResults = async (mealId: string)
```

### Updated Log Screen Workflow

1. **Image Capture**: User takes photo or uploads image
2. **Immediate Save**: Save meal record with `processing_status: 'analyzing'`
3. **Background Analysis**: Call `analyzeImageMeal` function
4. **Progress Feedback**: Show user that analysis is in progress
5. **Results Update**: Edge function updates meal record with analysis
6. **Notification**: User sees completed analysis in journal

## 🔧 Configuration & Environment

### Required Environment Variables

```bash
# Supabase Edge Functions Environment Variables
OPENAI_API_KEY=sk-...           # OpenAI API key for GPT-4 Vision/Turbo (required for transcription)
SUPABASE_URL=https://...        # Your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=...   # Service role key for database access

# OpenRouter Configuration (optional, enables model switching)
OPENROUTER_API_KEY=sk-or-...     # OpenRouter API key (get from https://openrouter.ai)
OPENROUTER_SITE_URL=https://... # Your app URL (recommended by OpenRouter)
OPENROUTER_APP_NAME=MealScanner # Your app name (recommended by OpenRouter)

# Optional: Default LLM Provider/Model Configuration
LLM_DEFAULT_PROVIDER=openai     # Default provider: 'openai' or 'openrouter'
LLM_DEFAULT_TEXT_MODEL=gpt-4-turbo-preview  # Default text model
LLM_DEFAULT_VISION_MODEL=gpt-4-vision-preview # Default vision model

# Optional: Rate limiting and caching
REDIS_URL=...                   # For caching and rate limiting
MAX_REQUESTS_PER_MINUTE=30      # Rate limiting
```

### LLM Provider Support

The system now supports multiple LLM providers through a unified router:

- **OpenAI** (default): Direct integration with OpenAI's API
  - Chat completions: GPT-4 Turbo, GPT-4 Vision
  - Transcription: Whisper API
- **OpenRouter**: Unified API for multiple LLM providers
  - Chat completions: Access to OpenAI, Anthropic, Google, and more models
  - Model format: `provider/model-name` (e.g., `openai/gpt-4o`, `anthropic/claude-3-opus`)
  - Transcription: Automatically falls back to OpenAI Whisper

### Switching LLM Providers and Models

You can switch providers and models per-request by including an optional `llm` field in the request body:

```typescript
// Example: Use OpenRouter with a specific model
{
  description: "Grilled chicken with vegetables",
  userId: "user-uuid",
  llm: {
    provider: "openrouter",
    model: "openai/gpt-4o"  // or "anthropic/claude-3-opus", etc.
  }
}

// Example: Use OpenAI with default model (backward compatible)
{
  description: "Grilled chicken with vegetables",
  userId: "user-uuid"
  // llm field omitted - uses default provider/model
}
```

**Recommended OpenRouter Models:**
- Text analysis: `openai/gpt-4-turbo`, `anthropic/claude-3-sonnet`
- Vision analysis: `openai/gpt-4o`, `openai/gpt-4-vision-preview`
- Cost-effective: `openai/gpt-3.5-turbo`, `google/gemini-pro`

**Note:** Speech-to-text always uses OpenAI Whisper (OpenRouter doesn't support transcription endpoints). If you request OpenRouter for transcription, it will automatically fallback to OpenAI with a warning log.

### Deployment Commands

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Link to your remote project
supabase link --project-ref your-project-ref

# Deploy database schema
supabase db push

# Deploy edge functions
supabase functions deploy analyze-meal-image
supabase functions deploy analyze-meal-text

# Set environment variables
supabase secrets set OPENAI_API_KEY=your-key-here

# Optional: Set OpenRouter configuration
supabase secrets set OPENROUTER_API_KEY=your-openrouter-key
supabase secrets set OPENROUTER_SITE_URL=https://your-app-url.com
supabase secrets set OPENROUTER_APP_NAME=MealScanner

# Optional: Set default provider/model preferences
supabase secrets set LLM_DEFAULT_PROVIDER=openrouter
supabase secrets set LLM_DEFAULT_TEXT_MODEL=openai/gpt-4-turbo
supabase secrets set LLM_DEFAULT_VISION_MODEL=openai/gpt-4o
```

## 🛡️ Error Handling & Reliability

### Error Categories

1. **API Errors**: LLM API failures, rate limits, invalid responses
2. **Database Errors**: Connection issues, constraint violations
3. **Validation Errors**: Invalid input data, missing required fields
4. **Processing Errors**: Image analysis failures, JSON parsing errors

### Fallback Strategies

```typescript
// Example error handling in edge function
try {
  const analysisResult = await callLLMAPI(prompt, image);
  return processSuccessfulAnalysis(analysisResult);
} catch (apiError) {
  if (apiError.status === 429) {
    // Rate limited - retry with exponential backoff
    return retryWithBackoff(callLLMAPI, prompt, image);
  } else if (apiError.status >= 500) {
    // Server error - try alternative provider
    return tryAlternativeProvider(prompt, image);
  } else {
    // Client error - return graceful degradation
    return basicNutritionEstimate(description);
  }
}
```

### Monitoring & Logging

- **Performance Metrics**: Processing time, success rates, confidence scores
- **Error Tracking**: Failed analyses, API errors, user impact
- **Usage Analytics**: Popular foods, analysis accuracy, user satisfaction

## 🧪 Testing Strategy

### Unit Tests
- Individual function testing for nutrition parsing
- Mock LLM responses for consistent testing
- Database operation validation

### Integration Tests
- End-to-end meal analysis workflow
- Error handling scenarios
- Rate limiting behavior

### Manual Testing Scenarios
- Various food types (breakfast, lunch, dinner, snacks)
- Complex meals with multiple components
- Different lighting and photo quality
- Edge cases (unusual foods, international cuisines)

## 📈 Performance Optimization

### Caching Strategy
- **LLM Response Caching**: Cache similar image/text analyses
- **User Goal Caching**: Store frequently accessed user preferences
- **Nutrition Database**: Cache common food nutrition data

### Rate Limiting
- **Per-User Limits**: Prevent abuse while allowing normal usage
- **API Budget Management**: Monitor and control LLM API costs
- **Queue Management**: Handle high-volume periods gracefully

### Image Optimization
- **Compression**: Reduce image size before LLM analysis
- **Format Conversion**: Standardize image formats
- **Resolution Optimization**: Balance quality vs. processing speed

## 🔄 Version Management

### Analysis Versioning
- Track analysis algorithm versions
- Enable reprocessing of historical data
- A/B test different prompt strategies

### Database Migrations
- Backward-compatible schema changes
- Data migration scripts for major updates
- Rollback procedures for failed deployments

## 🎯 Success Metrics

### Accuracy Metrics
- **Nutrition Accuracy**: Compare AI estimates to known values
- **User Feedback**: User ratings of analysis quality

### User Experience Metrics
- **Analysis Completion Rate**: Successful analyses vs. failures
- **User Engagement**: Frequency of meal logging with AI analysis
- **Recommendation Effectiveness**: User adoption of AI suggestions

### Technical Metrics
- **Response Time**: Average analysis completion time
- **Error Rate**: Failed analyses and common failure modes
- **API Cost Efficiency**: Cost per successful analysis

---

## 🚀 Implementation Phases

### Phase 1: Core Infrastructure ✅
- [x] Database schema design
- [x] Edge function architecture
- [x] Basic image analysis endpoint
- [x] Text analysis endpoint

### Phase 2: Enhanced Analysis (Next)
- [ ] Advanced error handling and retry logic
- [ ] Nutrition database integration (USDA FoodData Central)
- [ ] Image preprocessing and optimization
- [ ] Response caching and performance improvements
- [ ] Enhanced prompt engineering

### Phase 3: Personalization
- [ ] User goal integration
- [ ] Recommendation engine
- [ ] Progress tracking
- [ ] Custom dietary restrictions

### Phase 4: Advanced Features
- [ ] Batch processing for multiple meals
- [ ] Recipe generation from ingredients
- [ ] Shopping list creation
- [ ] Social features and meal sharing

---

This documentation serves as the comprehensive guide for understanding, implementing, and maintaining the MealScanner LLM integration system. Regular updates will be made as new features are added and the system evolves. 