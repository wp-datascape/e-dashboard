// frontend/src/hooks/usePageSettings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pageApi } from '@/api/page.api';
import { useAuth } from '@/context/auth.context';

// Used in App.tsx with no args: data = PageSetting[] (via select)
export function usePageSettings() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['page-settings'],
    queryFn: () => pageApi.getPageSettings(),
    select: (response) => response.data,
    enabled: !!token,
  });
}

export function useConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => pageApi.getConfig(),
    select: (response) => response.data,
  });
}

export function useUpdatePageSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pageKey, ready }: { pageKey: string; ready: boolean }) =>
      pageApi.updatePageSetting(pageKey, ready),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-settings'] });
    },
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      pageApi.updateConfig(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
      // Threshold KPI berdampak ke response metrics — invalidate semua metrics cache
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
}
