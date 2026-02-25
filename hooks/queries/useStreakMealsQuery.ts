import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { getStreakMeals } from '@/lib/supabase';

interface UseStreakMealsQueryOptions {
  userId: string | undefined;
}

export function useStreakMealsQuery({ userId }: UseStreakMealsQueryOptions) {
  const query = useQuery({
    queryKey: queryKeys.meals.streak(userId ?? ''),
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await getStreakMeals(userId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
  });

  return {
    streakMeals: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
