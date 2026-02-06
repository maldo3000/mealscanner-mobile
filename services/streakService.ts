/**
 * Streak Service
 * Calculates and manages streak data, shields, milestones, and weekly stats
 */

import {
    MAX_SHIELDS,
    MILESTONE_DAYS,
    MIN_LOGS_PER_DAY,
    RISK_START_HOUR,
    SHIELD_EARN_INTERVAL,
    SHIELD_FIRST_EARN_DAY,
    STREAK_CACHE_KEY,
    STREAK_CACHE_VERSION,
    getMilestoneName,
    getNextMilestoneDay,
    type DayLogEntry,
    type MealForStreak,
    type MilestoneStatus,
    type ShieldInfo,
    type StreakCache,
    type StreakCardState,
    type StreakSummary,
    type WeeklyStats,
} from '@/types/streak';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =============================================================================
// DATE UTILITIES
// =============================================================================

/**
 * Normalizes a date to midnight in local timezone
 */
function normalizeToLocalMidnight(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Gets today's date at midnight local time
 */
function getToday(): Date {
  return normalizeToLocalMidnight(new Date());
}

/**
 * Format date as YYYY-MM-DD in local timezone
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get Monday of the current week (week starts Monday)
 */
function getWeekStartMonday(date: Date): Date {
  const normalized = normalizeToLocalMidnight(date);
  const dayOfWeek = normalized.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  normalized.setDate(normalized.getDate() + diffToMonday);
  return normalized;
}

/**
 * Calculate days difference between two dates
 */
function getDaysDifference(date1: Date, date2: Date): number {
  const d1 = normalizeToLocalMidnight(date1);
  const d2 = normalizeToLocalMidnight(date2);
  return Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is today
 */
function isToday(date: Date): boolean {
  return getDaysDifference(date, new Date()) === 0;
}

// =============================================================================
// MEAL GROUPING
// =============================================================================

interface DayMealData {
  date: Date;
  dateKey: string;
  mealsCount: number;
  meals: MealForStreak[];
}

/**
 * Groups meals by local date
 */
function groupMealsByDate(meals: MealForStreak[]): Map<string, DayMealData> {
  const grouped = new Map<string, DayMealData>();

  for (const meal of meals) {
    const mealDate = new Date(meal.created_at);
    const localDate = normalizeToLocalMidnight(mealDate);
    const dateKey = formatDateKey(localDate);

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, {
        date: localDate,
        dateKey,
        mealsCount: 0,
        meals: [],
      });
    }

    const dayData = grouped.get(dateKey)!;
    dayData.mealsCount++;
    dayData.meals.push(meal);
  }

  return grouped;
}

// =============================================================================
// STREAK CALCULATION
// =============================================================================

/**
 * Calculates the current streak from meal data
 * A day counts as "logged" if >= MIN_LOGS_PER_DAY meals were logged
 */
function calculateCurrentStreak(mealsByDate: Map<string, DayMealData>): number {
  if (mealsByDate.size === 0) return 0;

  const today = getToday();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayKey = formatDateKey(today);
  const yesterdayKey = formatDateKey(yesterday);

  // Check if today or yesterday has enough logs
  const todayData = mealsByDate.get(todayKey);
  const yesterdayData = mealsByDate.get(yesterdayKey);

  const hasTodayLogs = todayData && todayData.mealsCount >= MIN_LOGS_PER_DAY;
  const hasYesterdayLogs = yesterdayData && yesterdayData.mealsCount >= MIN_LOGS_PER_DAY;

  // If neither today nor yesterday has logs, streak is 0
  if (!hasTodayLogs && !hasYesterdayLogs) return 0;

  // Start counting from today if logged, otherwise from yesterday
  let currentDate = hasTodayLogs ? today : yesterday;
  let streak = 0;

  while (true) {
    const dateKey = formatDateKey(currentDate);
    const dayData = mealsByDate.get(dateKey);

    if (dayData && dayData.mealsCount >= MIN_LOGS_PER_DAY) {
      streak++;
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculates the longest streak from all meal history
 */
function calculateLongestStreak(mealsByDate: Map<string, DayMealData>): number {
  if (mealsByDate.size === 0) return 0;

  // Get sorted dates with qualifying logs
  const qualifyingDates = Array.from(mealsByDate.values())
    .filter(d => d.mealsCount >= MIN_LOGS_PER_DAY)
    .map(d => d.date)
    .sort((a, b) => a.getTime() - b.getTime());

  if (qualifyingDates.length === 0) return 0;

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < qualifyingDates.length; i++) {
    const daysDiff = getDaysDifference(qualifyingDates[i], qualifyingDates[i - 1]);

    if (daysDiff === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else if (daysDiff > 1) {
      currentStreak = 1;
    }
    // daysDiff === 0 means same day, skip
  }

  return longestStreak;
}

// =============================================================================
// CARD STATE
// =============================================================================

/**
 * Determines the card state based on current conditions
 */
function determineCardState(
  mealsLoggedToday: number,
  currentHour: number
): StreakCardState {
  const isLocked = mealsLoggedToday >= MIN_LOGS_PER_DAY;

  if (isLocked) {
    return 'LOCKED';
  }

  if (currentHour >= RISK_START_HOUR) {
    return 'AT_RISK';
  }

  return 'NOT_LOCKED';
}

// =============================================================================
// SHIELDS
// =============================================================================

interface ShieldData {
  count: number;
  lastUsedDate?: string;
  earnedShields: number; // Total shields ever earned
}

const SHIELD_STORAGE_KEY = 'streak_shields';

/**
 * Load shield data from storage
 */
async function loadShieldData(): Promise<ShieldData> {
  try {
    const data = await AsyncStorage.getItem(SHIELD_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading shield data:', error);
  }
  return { count: 0, earnedShields: 0 };
}

/**
 * Save shield data to storage
 */
async function saveShieldData(data: ShieldData): Promise<void> {
  try {
    await AsyncStorage.setItem(SHIELD_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving shield data:', error);
  }
}

/**
 * Calculate how many shields should be earned by a given streak
 */
function calculateEarnedShields(streak: number): number {
  if (streak < SHIELD_FIRST_EARN_DAY) return 0;
  
  // First shield at day 7, then one every 14 days
  let shields = 1; // First at day 7
  let nextEarn = SHIELD_FIRST_EARN_DAY + SHIELD_EARN_INTERVAL;
  
  while (nextEarn <= streak) {
    shields++;
    nextEarn += SHIELD_EARN_INTERVAL;
  }
  
  return shields;
}

/**
 * Get next day when a shield will be earned
 */
function getNextShieldEarnDay(currentStreak: number): number {
  if (currentStreak < SHIELD_FIRST_EARN_DAY) {
    return SHIELD_FIRST_EARN_DAY;
  }
  
  // Find next earn day after current streak
  let day = SHIELD_FIRST_EARN_DAY;
  while (day <= currentStreak) {
    day += SHIELD_EARN_INTERVAL;
  }
  
  return day;
}

/**
 * Process shields: award new ones, consume if streak broken
 */
async function processShields(
  currentStreak: number,
  previousStreak: number,
  streakBroken: boolean
): Promise<ShieldInfo> {
  const shieldData = await loadShieldData();
  
  // Calculate how many shields should have been earned by now
  const shouldHaveEarned = calculateEarnedShields(currentStreak);
  const newShieldsEarned = shouldHaveEarned - shieldData.earnedShields;
  
  // Award new shields (up to max)
  if (newShieldsEarned > 0) {
    shieldData.earnedShields = shouldHaveEarned;
    shieldData.count = Math.min(shieldData.count + newShieldsEarned, MAX_SHIELDS);
  }
  
  // If streak would have been broken but we have shields, consume one
  // Note: This logic would be called from a separate process that detects streak breaks
  
  await saveShieldData(shieldData);
  
  return {
    count: shieldData.count,
    maxShields: MAX_SHIELDS,
    nextEarnDay: getNextShieldEarnDay(currentStreak),
    lastUsedDate: shieldData.lastUsedDate,
  };
}

/**
 * Use a shield to preserve streak
 * Returns true if shield was used successfully
 */
export async function useShield(): Promise<boolean> {
  const shieldData = await loadShieldData();
  
  if (shieldData.count <= 0) {
    return false;
  }
  
  shieldData.count--;
  shieldData.lastUsedDate = new Date().toISOString();
  
  await saveShieldData(shieldData);
  return true;
}

// =============================================================================
// MILESTONES
// =============================================================================

/**
 * Calculate milestone statuses
 */
function calculateMilestones(currentStreak: number, longestStreak: number): MilestoneStatus[] {
  const maxReached = Math.max(currentStreak, longestStreak);
  
  return MILESTONE_DAYS.map(day => ({
    day,
    name: getMilestoneName(day),
    achieved: maxReached >= day,
  }));
}

// =============================================================================
// WEEKLY STATS
// =============================================================================

/**
 * Calculate weekly stats (consistency and balanced days)
 */
function calculateWeeklyStats(mealsByDate: Map<string, DayMealData>): WeeklyStats {
  const today = getToday();
  const weekStart = getWeekStartMonday(today);
  const weekStartKey = formatDateKey(weekStart);
  
  let loggedDays = 0;
  let balancedDays = 0; // Placeholder for now
  
  // Check each day of the week
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(weekStart);
    checkDate.setDate(checkDate.getDate() + i);
    
    // Don't count future days
    if (checkDate > today) break;
    
    const dateKey = formatDateKey(checkDate);
    const dayData = mealsByDate.get(dateKey);
    
    if (dayData && dayData.mealsCount >= MIN_LOGS_PER_DAY) {
      loggedDays++;
      // Placeholder: count all logged days as balanced for now
      balancedDays++;
    }
  }
  
  return {
    loggedDaysThisWeek: loggedDays,
    balancedDaysThisWeek: balancedDays,
    weekStartDate: weekStartKey,
  };
}

// =============================================================================
// RECENT DAYS (14-day calendar)
// =============================================================================

/**
 * Get the last 14 days with log status
 */
function getRecentDays(mealsByDate: Map<string, DayMealData>): DayLogEntry[] {
  const today = getToday();
  const days: DayLogEntry[] = [];
  
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = formatDateKey(date);
    const dayData = mealsByDate.get(dateKey);
    
    days.push({
      date: dateKey,
      logged: dayData ? dayData.mealsCount >= MIN_LOGS_PER_DAY : false,
      mealsCount: dayData?.mealsCount || 0,
      isToday: i === 0,
    });
  }
  
  return days;
}

// =============================================================================
// MAIN STREAK COMPUTATION
// =============================================================================

/**
 * Compute complete streak summary from meals
 */
export async function computeStreakSummary(
  meals: MealForStreak[],
  userId?: string
): Promise<StreakSummary> {
  const mealsByDate = groupMealsByDate(meals);
  const today = getToday();
  const todayKey = formatDateKey(today);
  const currentHour = new Date().getHours();
  
  // Calculate core streak values
  const currentStreak = calculateCurrentStreak(mealsByDate);
  const longestStreak = calculateLongestStreak(mealsByDate);
  
  // Today's data
  const todayData = mealsByDate.get(todayKey);
  const mealsLoggedToday = todayData?.mealsCount || 0;
  const isLockedToday = mealsLoggedToday >= MIN_LOGS_PER_DAY;
  
  // Card state
  const cardState = determineCardState(mealsLoggedToday, currentHour);
  
  // Shields
  const shields = await processShields(currentStreak, 0, false);
  
  // Milestones
  const milestones = calculateMilestones(currentStreak, longestStreak);
  const nextMilestoneDay = getNextMilestoneDay(currentStreak);
  const nextMilestone = milestones.find(m => m.day === nextMilestoneDay) || {
    day: nextMilestoneDay,
    name: getMilestoneName(nextMilestoneDay),
    achieved: false,
  };
  
  // Weekly stats
  const weeklyStats = calculateWeeklyStats(mealsByDate);
  
  // Recent days for calendar
  const recentDays = getRecentDays(mealsByDate);
  
  // Last log date
  const sortedDates = Array.from(mealsByDate.keys()).sort().reverse();
  const lastLogDate = sortedDates[0] || null;
  
  const summary: StreakSummary = {
    currentStreak,
    longestStreak,
    isLockedToday,
    mealsLoggedToday,
    cardState,
    shields,
    milestones,
    nextMilestone,
    weeklyStats,
    recentDays,
    lastLogDate,
    lastComputedAt: new Date().toISOString(),
  };
  
  // Cache the result
  if (userId) {
    await cacheStreakSummary(summary, userId);
  }
  
  return summary;
}

// =============================================================================
// CACHING
// =============================================================================

/**
 * Cache streak summary to AsyncStorage
 */
async function cacheStreakSummary(summary: StreakSummary, userId: string): Promise<void> {
  try {
    const today = formatDateKey(getToday());
    const cache: StreakCache = {
      summary,
      cacheKey: `${userId}_${today}`,
      version: STREAK_CACHE_VERSION,
    };
    await AsyncStorage.setItem(STREAK_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error caching streak summary:', error);
  }
}

/**
 * Load cached streak summary if valid
 */
export async function loadCachedStreakSummary(userId: string): Promise<StreakSummary | null> {
  try {
    const data = await AsyncStorage.getItem(STREAK_CACHE_KEY);
    if (!data) return null;
    
    const cache: StreakCache = JSON.parse(data);
    const today = formatDateKey(getToday());
    const expectedKey = `${userId}_${today}`;
    
    // Validate cache
    if (cache.version !== STREAK_CACHE_VERSION) return null;
    if (cache.cacheKey !== expectedKey) return null;
    
    return cache.summary;
  } catch (error) {
    console.error('Error loading cached streak summary:', error);
    return null;
  }
}

/**
 * Invalidate streak cache (call after logging a meal)
 */
export async function invalidateStreakCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STREAK_CACHE_KEY);
  } catch (error) {
    console.error('Error invalidating streak cache:', error);
  }
}

// =============================================================================
// DEV HELPERS
// =============================================================================

/**
 * Generate mock meal data for testing streak logic
 * @param daysWithMeals Array of day offsets from today (0 = today, -1 = yesterday, etc.)
 */
export function generateMockMeals(daysWithMeals: number[]): MealForStreak[] {
  const today = getToday();
  
  return daysWithMeals.map((dayOffset, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(12, 0, 0, 0); // Noon
    
    return {
      id: `mock-meal-${index}`,
      created_at: date.toISOString(),
      health_score: 'healthy' as const,
    };
  });
}

/**
 * Test streak calculation with mock data
 */
export async function testStreakCalculation(): Promise<void> {
  console.log('=== Streak Service Test ===');
  
  // Test 1: 3-day streak (today, yesterday, day before)
  const meals1 = generateMockMeals([0, -1, -2]);
  const summary1 = await computeStreakSummary(meals1);
  console.log('Test 1 (3 consecutive days):', {
    currentStreak: summary1.currentStreak,
    expected: 3,
    pass: summary1.currentStreak === 3,
  });
  
  // Test 2: Streak broken (no meal today, gap yesterday)
  const meals2 = generateMockMeals([-2, -3, -4]);
  const summary2 = await computeStreakSummary(meals2);
  console.log('Test 2 (streak broken):', {
    currentStreak: summary2.currentStreak,
    expected: 0,
    pass: summary2.currentStreak === 0,
  });
  
  // Test 3: Streak continues from yesterday
  const meals3 = generateMockMeals([-1, -2, -3]);
  const summary3 = await computeStreakSummary(meals3);
  console.log('Test 3 (streak from yesterday):', {
    currentStreak: summary3.currentStreak,
    expected: 3,
    pass: summary3.currentStreak === 3,
  });
  
  // Test 4: Card state at risk (would need to mock time)
  console.log('Test 4 (card state):', {
    lockedState: summary1.cardState,
    expected: 'LOCKED',
    pass: summary1.cardState === 'LOCKED',
  });
  
  console.log('=== Tests Complete ===');
}

// =============================================================================
// DEADLINE TIME FORMATTING
// =============================================================================

/**
 * Get deadline time string for AT_RISK state
 * Returns time in user's locale (e.g., "11:59 PM")
 */
export function getDeadlineTimeString(): string {
  const now = new Date();
  const deadline = new Date(now);
  deadline.setHours(23, 59, 59, 999);
  
  return deadline.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
