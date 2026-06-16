// frontend/src/api/dashboard.api.ts
import { api } from './axios';
import type { ApiResponse } from '@/types/api';
import type { DashboardData } from '@/types/dashboard';

export const dashboardApi = {
  getDashboard: () =>
    api.get<ApiResponse<DashboardData>>('/dashboard'),
};
