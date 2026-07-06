// frontend/src/hooks/useDashboard.ts
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboard.api';
import type { DashboardParams } from '@/api/dashboard.api';
import type { DashboardData } from '@/types/dashboard';

export const useDashboard = (params?: DashboardParams) => {
  return useQuery<DashboardData>({
    queryKey: ['dashboard', params],
    queryFn: async () => {
      const res = await dashboardApi.getDashboard(params);
      return res.data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
