import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
    getNotificationSettings,
    syncScheduledNotifications,
    updateWeeklyReportAvailableDate,
} from '@/lib/notifications';
import { queryKeys } from '@/lib/queryKeys';
import { getLatestWeeklyNutritionReportStatus } from '@/lib/supabase';

interface UseWeeklyReportStatusQueryOptions {
  userId: string | undefined;
  enabled?: boolean;
}

export function useWeeklyReportStatusQuery({ userId, enabled = true }: UseWeeklyReportStatusQueryOptions) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.weeklyReports.status(userId ?? ''),
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await getLatestWeeklyNutritionReportStatus(userId);
      if (error) throw error;
      return data;
    },
    enabled: enabled && !!userId,
  });

  // Sync notification schedule when status changes
  useEffect(() => {
    if (query.data?.nextAvailableAt) {
      void (async () => {
        await updateWeeklyReportAvailableDate(query.data!.nextAvailableAt);
        const settings = await getNotificationSettings();
        await syncScheduledNotifications(settings);
      })();
    }
  }, [query.data?.nextAvailableAt]);

  const invalidate = () => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.weeklyReports.status(userId ?? '') });
  };

  return {
    reportStatus: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    invalidate,
  };
}
