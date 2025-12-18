/**
 * Utility functions for calculating streaks from meal data
 */

interface Meal {
  created_at: string;
}

/**
 * Normalizes a date to midnight in the user's local timezone
 */
function normalizeToDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Gets the difference in days between two dates
 */
function getDaysDifference(date1: Date, date2: Date): number {
  const diffTime = normalizeToDate(date1).getTime() - normalizeToDate(date2).getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Gets unique dates from meals (one entry per day)
 */
function getUniqueMealDates(meals: Meal[]): Date[] {
  const dateSet = new Set<string>();
  const dates: Date[] = [];

  for (const meal of meals) {
    const mealDate = normalizeToDate(new Date(meal.created_at));
    const dateKey = mealDate.toISOString().split('T')[0];

    if (!dateSet.has(dateKey)) {
      dateSet.add(dateKey);
      dates.push(mealDate);
    }
  }

  // Sort dates in descending order (most recent first)
  return dates.sort((a, b) => b.getTime() - a.getTime());
}

/**
 * Calculates the current streak (consecutive days with at least one meal)
 * A streak continues if there's at least one meal per day, starting from today or yesterday
 * If there's a meal today, count backwards from today
 * If no meal today but there's a meal yesterday, count backwards from yesterday
 * If no meal today or yesterday, streak is 0
 */
export function calculateCurrentStreak(meals: Meal[]): number {
  if (meals.length === 0) return 0;

  const uniqueDates = getUniqueMealDates(meals);
  if (uniqueDates.length === 0) return 0;

  const today = normalizeToDate(new Date());
  const yesterday = normalizeToDate(new Date());
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if there's a meal today or yesterday
  const hasToday = uniqueDates.some(
    date => getDaysDifference(today, date) === 0
  );
  const hasYesterday = uniqueDates.some(
    date => getDaysDifference(yesterday, date) === 0
  );

  // If no meal today or yesterday, streak is broken
  if (!hasToday && !hasYesterday) return 0;

  // Determine the starting date for streak calculation
  // If there's a meal today, start from today
  // Otherwise, start from yesterday (we know yesterday has a meal from the check above)
  const startDate = hasToday ? today : yesterday;

  // Count consecutive days backwards from startDate
  let streak = 0;
  let expectedDate = new Date(startDate);
  let dateIndex = 0;

  // Count consecutive days
  while (dateIndex < uniqueDates.length) {
    const currentDate = uniqueDates[dateIndex];
    const daysDiff = getDaysDifference(expectedDate, currentDate);

    if (daysDiff === 0) {
      // Found a meal on the expected day
      streak++;
      expectedDate = normalizeToDate(new Date(expectedDate));
      expectedDate.setDate(expectedDate.getDate() - 1);
      dateIndex++;
    } else if (daysDiff < 0) {
      // We've gone past the expected date, move to next date in list
      dateIndex++;
    } else {
      // Gap found (expectedDate is before currentDate), streak is broken
      break;
    }
  }

  return streak;
}

/**
 * Calculates the longest streak from all meal history
 */
export function calculateLongestStreak(meals: Meal[]): number {
  if (meals.length === 0) return 0;

  const uniqueDates = getUniqueMealDates(meals);
  if (uniqueDates.length === 0) return 0;

  let longestStreak = 1;
  let currentStreak = 1;

  // Iterate through dates in descending order and find longest consecutive sequence
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = uniqueDates[i - 1];
    const currentDate = uniqueDates[i];
    const daysDiff = getDaysDifference(prevDate, currentDate);

    if (daysDiff === 1) {
      // Consecutive day found
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      // Gap found, reset current streak
      currentStreak = 1;
    }
  }

  return longestStreak;
}

/**
 * Gets meal counts for the current week (Monday-Sunday)
 * Returns an array of 7 numbers representing meals per day, starting from Monday
 */
export function getWeeklyMealCounts(meals: Meal[]): number[] {
  const weeklyCounts = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
  const today = normalizeToDate(new Date());
  
  // Get Monday of the current week
  const monday = new Date(today);
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(today.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  
  // Get Sunday of the current week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  // Count meals per day for the current week
  for (const meal of meals) {
    const mealDate = normalizeToDate(new Date(meal.created_at));
    
    // Check if meal is within the current week (Monday to Sunday)
    if (mealDate >= monday && mealDate <= sunday) {
      // Get the day of week for the meal date (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
      const mealDayOfWeek = mealDate.getDay();
      // Convert to Monday-based index (0 = Monday, 6 = Sunday)
      const mondayBasedIndex = mealDayOfWeek === 0 ? 6 : mealDayOfWeek - 1;
      weeklyCounts[mondayBasedIndex]++;
    }
  }

  return weeklyCounts;
}

