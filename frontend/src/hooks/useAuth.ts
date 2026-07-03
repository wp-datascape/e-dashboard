// src/hooks/useAuth.ts
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi, LoginInput } from '@/api/auth.api';
import { useAuth } from '@/context/auth.context';
import { LoginResponse } from '@/types/auth';
import { ApiError } from '@/types/api';
import { queryClient } from '@/lib/queryClient';

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
  const { logout } = useAuth();

  return useMutation<void, ApiError, void>({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // 1. Clear state lokal dan localStorage
      logout();

      // 2. Bersihkan seluruh cache React Query agar tidak ada data bocor (stale data)
      queryClient.clear();

      // 3. Hard redirect (bukan navigate SPA) — memory JS di-reset total (state
      // komponen, closure, cache), bukan cuma unmount, supaya data lama benar-benar
      // hilang dari browser saat logout
      window.location.href = '/login';
    },
  });
}