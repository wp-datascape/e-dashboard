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
    // retry: false (override default retry 2x di queryClient.ts) — query ini
    // nge-gate SELURUH routing app (App.tsx render Routes dari sini), bukan cuma
    // 1 widget. Default retry 2x + axios timeout 40 detik/percobaan bisa bikin
    // ConnectionError baru muncul ~2 menit kalau server genuinely down/offline
    // (laporan user 2026-07-24: "loading tidak berhenti"). Gagal sekali langsung
    // tampilkan ConnectionError + tombol Retry manual, lebih responsif drpd nunggu
    // auto-retry 2x lagi utk query yang blocking seperti ini.
    retry: false,
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
