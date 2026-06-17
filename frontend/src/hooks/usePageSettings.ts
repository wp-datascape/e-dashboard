// src/hooks/usePageSettings.ts
import { useQuery } from '@tanstack/react-query';
import { pageApi } from '@/api/page.api';
import type { PageSetting } from '@/types/page';

export function usePageSettings() {
  return useQuery<PageSetting[]>({
    queryKey: ['page-settings'],
    queryFn: async () => {
      const response = await pageApi.getPageSettings();
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // Cache aman selama 5 menit
  });
}
