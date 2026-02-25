# MealScanner Mobile

## Tech Stack
- **Framework:** Expo SDK 54, React Native 0.81.5, React 19, New Architecture enabled
- **Routing:** expo-router v6 (file-based, typed routes)
- **Styling:** NativeWind v4 (Tailwind CSS for RN) — primary. StyleSheet.create for animations only
- **Backend:** Supabase (Auth, PostgreSQL + RLS, Storage, Edge Functions in Deno)
- **AI:** OpenRouter → Google Gemini (vision + text), OpenAI Whisper (transcription)
- **Subscriptions:** RevenueCat (`react-native-purchases`)
- **Health:** @kingstinct/react-native-healthkit
- **Animations:** react-native-reanimated v4, @shopify/react-native-skia
- **Data fetching:** TanStack Query (React Query) for Supabase reads
- **Validation:** Zod v4

## Architecture
### Provider Stack (root → inner)
```
GestureHandlerRootView → ErrorBoundary → QueryClientProvider → ThemeProvider → AuthProvider → SubscriptionProvider → RootLayoutContent → NavigationThemeProvider → Stack Navigator
```

### Key Directories
- `app/` — Expo Router screens (auth group, tabs group, meal/recipe detail, settings)
- `components/` — UI components organized by domain (capture/, streak/, recipe/, share/, ui/)
- `context/` — AuthContext, SubscriptionContext, ThemeContext, CaptureContext
- `hooks/` — Custom hooks; `hooks/queries/` for React Query hooks
- `lib/` — Supabase client + 40+ helper functions, RevenueCat, HealthKit, queryClient, queryKeys
- `supabase/functions/` — 11 Deno Edge Functions (analyze-meal-*, speech-to-text, generate-recipe-*, etc.)
- `supabase/migrations/` — PostgreSQL migrations with RLS
- `constants/` — Colors, themes, Typography, Spacing, Layout, Brand

### Data Fetching Pattern
- React Query hooks in `hooks/queries/` wrap Supabase helper functions from `lib/supabase.ts`
- Query keys centralized in `lib/queryKeys.ts`
- QueryClient config in `lib/queryClient.ts` (5 min staleTime, 10 min gcTime)
- Invalidate queries after mutations using `queryClient.invalidateQueries`
- `useFocusEffect` with conditional `refetch()` for screen focus behavior

## Coding Conventions
- TypeScript strict mode, explicit types, no `any`
- Prefer `interface` over `type` for object shapes
- Functional components only, max ~200 lines
- Named exports for hooks/utilities
- Import order: React/RN → Expo → Third-party → Local → Types → Relative
- NativeWind/Tailwind-first styling; green theme, no emojis in UI
- 44px minimum touch targets, safe area insets via `useSafeAreaInsets()`
- `React.memo()` for expensive re-rendering components
- `FlatList` for long lists

## Common Commands
```bash
npm start                    # sync-legal.js + expo start
npm run ios                  # sync-legal.js + expo run:ios
npm run android              # sync-legal.js + expo run:android
npm run doctor               # npx expo-doctor (config health check)
npm run prebuild             # expo-doctor + expo prebuild
npm run deploy:functions     # Deploy Supabase Edge Functions
npm run db:migrate           # supabase db push
eas build --profile production --platform ios
eas build --profile production --platform android
```

## Gotchas
- `scripts/sync-legal.js` runs before every `start`/`ios`/`android` — syncs legal markdown to constants
- Reanimated babel plugin MUST be last in `babel.config.js`
- `metro.config.js` has SVG transformer + NativeWind integration with `global.css`
- Two themes: "Editorial Herbarium" (dark green) and "Classic Green" (vibrant) — CSS variables in `global.css`
- Free users: 3 daily scans, 7-day meal history. Pro: unlimited
- RevenueCat has web mocks (`lib/revenueCatWebMock.ts`) for web development
- Apple Health requires entitlements in `MealScanner.entitlements`
- Bundle ID: `app.mealscanner` (both iOS and Android)
