import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/axios'
import { useAuth } from '@/context/auth.context'
import { useUpdateMyPreferences } from './useAuth'

// Baca `dismissed_banners` dari cache query 'me' (GET /auth/me) - pola sama
// useMyScope.ts, query key+queryFn sama persis supaya share cache dengan
// App.tsx, tidak fetch ulang.
export function useDismissedBanners(): string[] {
  const { token } = useAuth()
  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data.data),
    enabled: !!token,
    staleTime: 0,
  })
  return (data?.preferences?.dismissed_banners as string[] | undefined) ?? []
}

// Tandai 1 banner sudah ditutup/di-klik (task032) - kirim ARRAY PENUH (kunci
// lama + kunci baru), bukan endpoint "append" khusus, karena
// updateUserPreferences() di backend replace per-field, bukan deep-merge
// array. useUpdateMyPreferences sudah invalidate query 'me' otomatis, jadi
// banner langsung hilang tanpa reload begitu mutation sukses.
export function useDismissBanner() {
  const dismissed = useDismissedBanners()
  const mutation = useUpdateMyPreferences()

  return {
    dismiss: (key: string) => {
      if (dismissed.includes(key)) return
      mutation.mutate({ dismissed_banners: [...dismissed, key] })
    },
  }
}
