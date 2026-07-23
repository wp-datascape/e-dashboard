// frontend/src/api/dashboard.api.ts
import { api } from './axios';
import type { ApiResponse } from '@/types/api';
import type { DashboardData } from '@/types/dashboard';

export interface DashboardParams {
  company_id?: number | 'all';
  branch_id?: number;
  division?: string;
  period_end?: string;
  exclude_intercompany?: boolean;
}

export const dashboardApi = {
  getDashboard: (params?: DashboardParams) =>
    api.get<ApiResponse<DashboardData>>('/dashboard', { params }),
};
