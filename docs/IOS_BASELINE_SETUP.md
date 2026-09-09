# MealScanner baseline fixes and iOS setup
Updated September 9, 2026.

## Status
The working copy is at `/Users/joshmaldonado/Projects/mealscanner-mobile`, on local branch `fix/ios-baseline`. Changes are uncommitted and have not been pushed or deployed. This is a tested source-code baseline, not confirmation that the live app's purchasing configuration is fixed.

### Implemented
- Aligned the existing Expo SDK 55 dependencies with its recommended patch versions, including React Native 0.83.10. This is not a major Expo SDK migration.
- Subscription activation now checks a successful server response for the same user and expected tier, retries delayed activation, and offers Retry Activation without another purchase. Restore uses the current user and no longer produces duplicate success alerts. RevenueCat identity transitions are serialized and stale results guarded; SDK listeners are correctly removed.
- Empty/unavailable offerings now show a retryable error. Removed unsupported savings/trial claims from the custom paywall.
- Apple Health exports acknowledge success only after every requested sample saves. Concurrent exports coalesce; new samples use stable per-meal/per-nutrient IDs and versions to support retries and edits without additive duplication.
- Fixed the nutrition dashboard's goal field mapping, a capture callback referenced before initialization, conditional/looped React hooks, and SDK/type incompatibilities.
- Data exports paginate beyond the API's 1,000-row default. Clear History uses one user-filtered delete and checks errors; resetting goals also deletes the cloud goal instead of immediately reloading it.
- Clear the query cache after successful sign-out and invalidate data after history deletion.
- Import only the two used Source Sans font weights. Exported asset entries dropped from 117 to 103; no device speed benchmark has been performed.
- Added public-only `.env.example`, repeatable checks and 15 regression tests.
- Updated the vulnerable `shell-quote` tooling dependency. Audit entries fell from 47 to 35, with zero critical entries remaining. Twelve high, 21 moderate and two low entries still need dependency-by-dependency review; these counts are not proof of runtime exploitability.
- Prepared, but did not deploy, a subscription Edge Function fix (bounded RevenueCat fetch and verified profile update) and a forward SQL migration preserving sugar/sodium/cholesterol totals and restricting direct access to the privileged recompute function.
- Set runtime version `1.0.2` in app config and both checked-in native projects. Marketing version remains unchanged. Native dependencies changed, so these updates must not target existing runtime `1.0.1` binaries. See [Expo runtime compatibility](https://docs.expo.dev/eas-update/runtime-versions/).

## Verified locally
| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed, zero mobile/shared TypeScript errors |
| `npm run lint` | Passed, zero errors; 157 warnings remain |
| `npm test` | 15 passed |
| `npm run check` | Passed |
| iOS production JavaScript export | Passed; approximately 9.1 MB Hermes bundle, 103 asset entries |
| `expo install --check` | Dependencies aligned |
| Deno check, modified subscription Edge Function | Passed using separate Deno dependency cache |
| `git diff --check` | Passed |
| Expo Doctor | 18/20 passed; CocoaPods missing and native/app config synchronization warning |

The mobile TypeScript/lint scope intentionally excludes Deno Edge Functions, generated native code and the separate video project. The changed subscription function was checked separately; the other backend functions and the video project have not been made type-clean. Tests mock native/network boundaries, so they do not validate Apple purchases, RevenueCat dashboard settings, HealthKit permissions or live RLS. The deliberate failed-write test logs an expected Apple Health error.

The iOS export used placeholder public Supabase configuration solely to test bundling. No live sign-in, scan, store transaction or health write was performed. The new SQL migration has not been executed against PostgreSQL; it needs staging validation and is not a migration-history repair.

## What you need to do
1. Install full Xcode from Apple's App Store, open it once, and complete its additional components/iOS simulator setup. This computer currently selects `/Library/Developer/CommandLineTools`; Xcode's presence and active developer path need rechecking afterward.
2. Have your iPhone and access to your Apple Developer/App Store Connect, Expo, RevenueCat and Supabase accounts available. You should handle sign-in, two-factor prompts, agreements and payment/account approvals yourself. Do not paste passwords, private keys or server secrets into chat.
3. Supply the existing project's public Supabase URL and anon/publishable key through the local environment file, plus the appropriate public Google client IDs if testing Google sign-in. These are not service-role credentials. The example file lists the expected names.
4. Use a development build. This app includes RevenueCat and HealthKit native modules; Expo Go is not sufficient for verifying the actual iOS purchase flow. [Expo purchase guidance](https://docs.expo.dev/guides/in-app-purchases/) and [RevenueCat Expo setup](https://www.revenuecat.com/docs/getting-started/installation/expo).

I can then configure/check CocoaPods and the developer toolchain, reconcile native settings without discarding custom native files, refresh the pod lockfile, build the app and investigate device logs. EAS cloud builds are another route if preferred, but need account access and may consume your build quota; none were started.

## Account checks we should perform together
### RevenueCat / App Store Connect
- Confirm the iOS app is `app.mealscanner` and its publishable SDK key belongs to the expected RevenueCat project.
- Verify products, the current offering and packages, and the exact entitlement `MealScanner Pro`.
- Check App Store product availability and Apple's agreements, banking/tax and subscription configuration.
- Confirm a sandbox purchase appears under the signed-in Supabase user's UUID in RevenueCat.
- Confirm the Supabase function has the correct server-side `REVENUECAT_SECRET_KEY`. Keep it only in server secrets.
- Test purchase, cancellation, restore after reinstall, delayed/offline activation, expiration/refund, account switching, redemption and subscription management.

### Supabase
Inspect current function logs, profile tier updates, schema and migration history before deploying anything. Validate the new migration on a staging copy, including owner item insert/update/delete, nutrient totals, the hero-image RPC and denied direct recompute calls by anonymous/authenticated roles. It does not backfill existing totals.

Do not run the current broad `deploy:functions` script yet. Its link check/function list are outdated and it automatically pushes historical migrations. The migration history has ordering gaps and does not fully document goal-profile columns used by the client. We need a targeted, reviewed deployment plan after inspecting the existing database.

## Remaining work before calling the app reliable
- Make multi-item meal reanalysis atomic: existing code can delete prior items before inference succeeds. Fixing this requires coordinated backend/SQL work and rollback tests.
- Unify scan usage accounting. The client counts successful AI scans while the server counts meal rows; Pro is advertised as unlimited but has a server cap. Decide the intended policy before changing billing-related limits or promises.
- Correct/test LLM fallback routing, timeout behavior and accepted model inputs across the analysis functions.
- Reconcile historical migrations and goal schema with the actual database.
- Apple Health still syncs through the existing meal-detail path. Historical legacy exports are intentionally skipped to prevent duplication, so previously false “synced” markers are not automatically repaired. Deleting meals, clearing history, and removing nutrients do not yet remove corresponding Health samples. Full background reconciliation remains separate work.
- Compress/resize the 12 recipe PNGs (about 82.5 MB combined), and profile startup, scrolling, image memory and repeated queries on an iPhone. The font change is not a substitute for that work.
- Resolve remaining dependency advisories and useful lint warnings; run the full scan/edit/delete/export/goal/auth test matrix, including offline failure recovery.
- Refresh native dependencies and verify an actual iOS build before TestFlight. Do not use clean prebuild blindly: native folders contain existing configuration.

## Local checks
From the repository:
```sh
npm run check
```

After environment and native setup, we can run a development build and start Metro for the development client. The existing EAS development profile uses Node 22.14.0; this Mac currently has Node 26.7.0. Align the local Node major with the build environment during native setup instead of changing it globally without review.
