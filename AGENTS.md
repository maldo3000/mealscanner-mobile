# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
MealScanner is a React Native / Expo SDK 54 mobile app (TypeScript) for AI-powered meal nutrition analysis. Backend is hosted Supabase (Postgres + Auth + Edge Functions). See `README.md` for full details.

### Package manager
npm (lockfile: `package-lock.json`). Install with `npm install`.

### Key commands
| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Lint | `npx expo lint` |
| Type check | `npx tsc --noEmit` |
| Start dev server | `npm start` (or `npx expo start`) |
| Start web dev | `npx expo start --web` |

### Important caveats

- **Web mode works**: Running on web (`expo start --web`) renders the full app. The HealthKit imports in `lib/health/AppleHealthService.ts` are lazy-loaded (only required on iOS at runtime) so they don't break web. Always start with `--clear` flag if the Metro cache gets stale (e.g. after deleting files).
- **Supabase env vars required**: The app requires `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` environment variables. Without them, the Supabase client initialization throws `supabaseUrl is required`. These are configured as Cursor Cloud secrets and injected automatically. A `.env` file is also created in the project root during setup.
- **No Android emulator or iOS simulator**: Full end-to-end testing requires a mobile device or emulator, which is unavailable on headless Linux. Dev server startup, linting, and type checking can all be verified on this VM.
- **Supabase Edge Functions**: Located in `supabase/functions/`. These are Deno-based and will show TypeScript errors when checked with the Node.js `tsc` — this is expected. They are deployed to Supabase cloud, not run locally.
- **Pre-existing lint/type errors**: The codebase has ~14 ESLint errors and ~127 warnings, plus TypeScript errors in components and edge functions. These are pre-existing and do not indicate environment issues.
