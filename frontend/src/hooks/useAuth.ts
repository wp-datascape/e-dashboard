// src/hooks/useAuth.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi, LoginInput, UserPreferencesInput } from '@/api/auth.api';
import { useAuth } from '@/context/auth.context';
import { LoginResponse } from '@/types/auth';
import { ApiError } from '@/types/api';

export function useLoginMutation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Ambil rute asal sebelum user ditendang ke halaman login
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';


  return useMutation<LoginResponse, ApiError, LoginInput>({
    mutationFn: authApi.login,
    onSuccess: (responseData) => {
      const { token, user, permissions } = responseData.data;
      login(token, user, permissions ?? []);
      navigate(from, { replace: true });
    },
    onError: (error: ApiError) => {
    console.error('Login action failed:', error);
    },
  });
}

export function useLogoutMutation() {
  return useMutation<void, ApiError, void>({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Hard redirect (bukan navigate SPA) — reload penuh sudah otomatis membuang
      // seluruh state React & cache React Query di memori, jadi cukup bersihkan
      // localStorage (yang persist lintas reload) lalu navigasi.
      //
      // JANGAN panggil logout()/queryClient.clear() di sini: window.location.href
      // tidak langsung unload halaman, jadi React masih sempat re-render dengan
      // token=null + cache page-settings kosong SEBELUM navigasi selesai. App.tsx
      // generate route dari pageSettings — begitu cache-nya kosong, tabel route
      // jadi kosong dan URL lama (mis. /dashboard) jatuh ke wildcard 404 selama
      // jeda itu, sebelum akhirnya browser pindah ke /login.
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_permissions');
      window.location.href = '/login';
    },
  });
}

// Task003 — self-service update preferensi sendiri (theme/palette/bahasa). Caller
// (AppSettings/UserMenu) tetap update state lokal (ThemeContext/i18n) langsung utk
// responsif instan - mutation ini cuma persist ke backend di background.
export function useUpdateMyPreferences() {
  const queryClient = useQueryClient();
  return useMutation<UserPreferencesInput, ApiError, UserPreferencesInput>({
    mutationFn: authApi.updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}