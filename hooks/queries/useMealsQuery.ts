import { useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/queryKeys';
import { getAllUserMeals, getJournalMeals, getUserMeals } from '@/lib/supabase';

interface UseMealsQueryOptions {
  userId: string | undefined;
  daysLimit?: number;
  limit?: number;
  /** Use the optimised journal column select instead of `select('*')` */
  journalMode?: boolean;
  enabled?: boolean;
}

export function useMealsQuery({ userId, daysLimit, limit, journalMode, enabled = true }: UseMealsQueryOptions) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...queryKeys.meals.all(userId ?? ''), { daysLimit, limit, journalMode }],
    queryFn: async () => {
      if (!userId) return [];
      if (journalMode && limit) {
        const { data, error } = await getJournalMeals(userId, limit, daysLimit);
        if (error) throw error;
        return data ?? [];
      }
      if (limit) {
        const { data, error } = await getUserMeals(userId, limit, daysLimit);
        if (error) throw error;
        return data ?? [];
      }
      const { data, error } = await getAllUserMeals(userId, daysLimit ?? 365);
      if (error) throw error;
      return data ?? [];
    },
    enabled: enabled && !!userId,
  });

  const invalidate = () => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.meals.all(userId ?? '') });
  };

  return {
    meals: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isRefetching: query.isRefetching,
    error: query.error,
    refetch: query.refetch,
    invalidate,
  };
}
