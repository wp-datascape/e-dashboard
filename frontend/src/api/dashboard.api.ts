// frontend/src/api/dashboard.api.ts
import { api } from './axios';
import type { ApiResponse } from '@/types/api';
import type { DashboardData } from '@/types/dashboard';

export interface DashboardParams {
  company_id?: number | 'all';
  branch_id?: number;
  division?: number;
  period_end?: string;
  // Awal rentang periode aktif (dari `getPeriodDateRange(periodType, ...)`,
  // pola sama dgn 10 halaman KPI individual) — task026 §9 lanjutan,
  // 2026-08-09: sebelumnya dropdown Periode (Bulanan/Kuartalan/Semester/
  // Tahunan) tidak pernah dikirim ke backend, jadi tidak berpengaruh apa pun.
  period_start?: string;
  exclude_intercompany?: boolean;
}

export const dashboardApi = {
  getDashboard: (params?: DashboardParams) =>
    api.get<ApiResponse<DashboardData>>('/dashboard', { params }),
};
