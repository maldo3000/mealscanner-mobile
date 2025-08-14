# MealScanner – Mobile App v0.1

Capture meals in seconds and return personalised, goal‑aligned nutrition insight with minimal friction.

## 📱 Project Overview

A React Native mobile application built with Expo that allows users to quickly capture and analyze their meals using AI-powered image recognition and nutritional analysis.

## 🎯 Primary Persona

Busy health‑conscious professional (25‑40) who wants quick, low‑judgement feedback to stay on track without weighing or counting everything.

## 🗂️ Top‑Level Navigation

| Tab | Purpose |
|-----|---------|
| **Home** | Current meal or last result snapshot (landing page placeholder for MVP) |
| **Log** | Capture flow (camera / text / voice) |
| **Journal** | Historical feed of meals; filter by day / week / custom |
| **Settings** | Profile, subscription, goals, metric visibility |
## 🔄 Core Flows & Requirements

### 4.1 Authentication
- **Primary**: Supabase Auth – email magic link + OAuth providers (Google, Apple, etc.)
- **Tokens**: Secure storage via expo-secure-store
- **Plan B** (budget fallback): Custom auth with self‑hosted backend

### 4.2 Log Meal Flow
1. Launch capture (default = camera via expo-camera)
2. Fallback options: type or voice (speech‑to‑text) input
3. POST `{image|text}` to `/api/parse‑meal`

### 4.3 Processing & Actions

**User can choose to:**
1. Estimate calories and macros
2. Estimate recipe

**Default outputs (always provided):**
- Meal name and ingredients
- Health score (healthy, moderately healthy, etc)
- Fibre score  
- Consultation paragraph based on set goal (or general feedback if no goal)

**ML endpoint returns:**
```typescript
{
  description: string,
  ingredients: string[],
  serving_estimate: string,
  calories?: number,
  macros?: object,
  qualitativeFeedback: string
}
```

**Portion Scaling UI:**
- AI estimate pre‑filled at 100%
- Slider (¼ → 2×) when metrics enabled
- Manual input field for gram/cup override (detail screen)

**Action Sheet Options:**
- Estimate Calories & Macros (if metrics on)
- Goal Feedback (auto, based on active goal)
- Recipe & At‑Home Alternative (optional button)
- Save all outputs as journal entry

### 4.4 Journal
- Chronological cards with thumbnail + date/time
- Tap → details screen with full data + portion override
- Daily/weekly totals (if metrics enabled)

### 4.5 Settings
- Profile (name, avatar)
- Subscription & billing portal link
- Nutrition Goal picker + free‑text (AI validated)
- Metrics Visibility toggle → hides calories/macros app‑wide

## 🛠️ Tech Stack (MVP)

- **Frontend**: React Native with Expo Router, TypeScript, NativeWind (Tailwind for RN)
- **Camera/Media**: expo-camera, expo-image-picker, expo-file-system
- **Storage**: expo-secure-store (local), Supabase (cloud)
- **Authentication**: Supabase Auth
- **Database**: Supabase (Postgres + Storage) – auth, user data, images
- **AI API**: Serverless function calling proprietary vision model + LLM

## 🚫 Out‑of‑Scope v0.1

- Social sharing or friend leaderboards
- Detailed micronutrient tracking beyond iron
- Multiple simultaneous nutrition goals (max 1 active)

## ❓ Open Questions

- Minimum viable qualitative feedback schema?
- Which paid tier unlocks recipe suggestions?

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server (interactive QR & platform picker)
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator  
npm run android

# Run on web
npm run web
```

Open the Expo Go app on your phone and scan the QR code to view the application, or use the iOS/Android simulators.

## 📁 Project Structure

```
mealscanner-mobile/
├── app/              # Expo Router pages and layouts
│   ├── (tabs)/       # Tab navigation screens
│   └── _layout.tsx   # Root layout
├── components/       # Reusable UI components
├── constants/        # App constants and configurations
├── hooks/           # Custom React hooks
├── assets/          # Images, fonts, and other static assets
└── README.md        # This file
```

## 📱 Dependencies

**Core:**
- `expo` - Development platform
- `expo-router` - File-based navigation
- `react-native` - Mobile framework

**Features:**
- `expo-camera` - Camera functionality
- `expo-image-picker` - Image selection
- `expo-secure-store` - Secure token storage
- `@supabase/supabase-js` - Backend SDK
- `nativewind` - Tailwind CSS for React Native

## 🔗 Useful Links

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [NativeWind](https://www.nativewind.dev/)
- [Supabase](https://supabase.com/docs)
- [Expo Router](https://docs.expo.dev/router/introduction/)
