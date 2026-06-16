import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { ApiError } from '@/types/api';
import { enqueueSnackbar } from 'notistack';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // Menambahkan tipe 'unknown' secara eksplisit demi kepatuhan strict mode
    onError: (error: unknown) => {
      const apiError = error as ApiError;
      if (apiError && apiError.error !== 'UNAUTHORIZED') {
        enqueueSnackbar(apiError.message || 'Gagal memproses permintaan data', { variant: 'error' });
      }
    },
  }),
  mutationCache: new MutationCache({
    // Menambahkan tipe 'unknown' secara eksplisit demi kepatuhan strict mode
    onError: (error: unknown) => {
      const apiError = error as ApiError;
      if (apiError && apiError.error !== 'UNAUTHORIZED') {
        enqueueSnackbar(apiError.message || 'Gagal mengeksekusi tindakan', { variant: 'error' });
      }
    },
  }),
  defaultOptions: {
    queries: {
      // Menambahkan tipe 'number' dan 'unknown' secara eksplisit
      retry: (failureCount: number, error: unknown): boolean => {
        const apiError = error as ApiError;
        
        // Defend against null/undefined object safely
        if (!apiError) return failureCount < 2;

        // Jangan lakukan retry jika error disebabkan oleh masalah hak akses/isolasi entitas
        if (
          apiError.error === 'UNAUTHORIZED' ||
          apiError.error === 'FORBIDDEN' ||
          apiError.error === 'COMPANY_ACCESS_DENIED'
        ) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false, // Direkomendasikan matang untuk dashboard analitik data besar
      staleTime: 1000 * 60 * 5, // Data dianggap segar selama 5 menit
    },
  },
});