// src/hooks/useAuth.ts
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { authApi, LoginInput } from '@/api/auth.api';
import { useAuth } from '@/context/AuthContext';
import { LoginResponse } from '@/types/auth';
import { ApiError } from '@/types/api';
import { enqueueSnackbar } from 'notistack';

export function useLoginMutation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Ambil rute asal sebelum user ditendang ke halaman login
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';


  return useMutation<LoginResponse, ApiError, LoginInput>({
    mutationFn: authApi.login,
    onSuccess: (responseData) => {
      // 1. Ekstrak data dari struktur LoginResponse Anda
      const { token, user } = responseData.data;

      // 2. Simpan ke AuthContext (dan otomatis ke localStorage)
      login(token, user);
      // 4. TRIGGER REDIRECT: Pindah ke rute yang dituju dengan 'replace' agar tidak bisa back ke login
      navigate(from, { replace: true });
    },
    onError: (error: ApiError) => {
    console.error('Login action failed:', error);
    },
  });
}

export function useLogoutMutation() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return useMutation<void, ApiError, void>({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // 1. Clear state lokal dan localStorage
      logout();
      
      // 2. Bersihkan seluruh cache React Query agar tidak ada data bocor (stale data)
      // Catatan: Jika ingin menggunakan queryClient.clear(), Anda bisa mengimport queryClient global Anda
      
      // 3. Redirect ke login
      navigate('/login', { replace: true });
      enqueueSnackbar('Sesi Anda telah berakhir.', { variant: 'info' });
    },
  });
}