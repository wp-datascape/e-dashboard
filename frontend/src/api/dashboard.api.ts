// frontend/src/api/dashboard.api.ts
import { api } from './axios';
import type { ApiResponse } from '@/types/api';
import type { DashboardData } from '@/types/dashboard';

export interface DashboardParams {
  company_id?: number | 'all';
  branch_id?: number;
  division?: number;
  period_end?: string;
  exclude_intercompany?: boolean;
  // Granularitas periode (2026-08-28, task029.md §41) — sebelumnya Overview
  // selalu bulanan, sekarang terima Monthly/Quarterly/Semester/Annual sama
  // seperti Growth/Retention/Value.
  period_type?: 'monthly' | 'quarter' | 'semester' | 'annual';
}

export const dashboardApi = {
  getDashboard: (params?: DashboardParams) =>
    api.get<ApiResponse<DashboardData>>('/dashboard', { params }),
};
