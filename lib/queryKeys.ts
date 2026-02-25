export const queryKeys = {
  meals: {
    all: (userId: string) => ['meals', userId] as const,
    detail: (mealId: string) => ['meal', mealId] as const,
    items: (mealId: string) => ['mealItems', mealId] as const,
    streak: (userId: string) => ['meals', userId, 'streak'] as const,
  },
  weeklyReports: {
    status: (userId: string) => ['weeklyReportStatus', userId] as const,
    all: (userId: string) => ['weeklyReports', userId] as const,
  },
  profile: (userId: string) => ['userProfile', userId] as const,
};
