// src/api/metrics.api.ts
import { api } from './axios';
import type { ApiResponse } from '@/types/api';
import type { CrossSellingData, CustomerMetricsData, DormantData, RevenueBreakdownData, ExpansionBreakdownData, GpBreakdownData, HmBreakdownData, RorBreakdownData, DormantBreakdownData, DormantStatusBreakdownData, DormantValueHistoryData, DormantCustomerStatus } from '@/types/metrics';

export const metricsApi = {
  getCrossSelling: async (params?: {
    company_id?: number | 'all';
    period_end?: string;
    // Granularitas trend/KPI Header (task029.md §30, 2026-08-20) — default
    // 'monthly' di backend kalau tidak dikirim, behavior lama tetap identik.
    period_type?: 'monthly' | 'quarter' | 'semester' | 'annual';
    // Mode "Apply date cutoff" (task029.md §30, 2026-08-20) — potong SEMUA
    // titik trend ke hari yang sama (bukan cuma titik yang sedang berjalan),
    // dipakai analisis mis. "20 hari pertama tiap bulan, 12 bulan terakhir".
    apply_date_cutoff?: boolean;
    // Hari filter HALAMAN yang sebenarnya (2026-08-23) — WAJIB dikirim kalau
    // apply_date_cutoff=true DAN request ini drilldown (period_end-nya bukan
    // tanggal filter halaman, tapi tanggal akhir bucket yang diklik). Lihat
    // komentar `useCrossSellingDetail`.
    cutoff_day?: number;
    // Bypass clampToElapsedEnd (2026-08-23) — dipakai `useCrossSellingDetail`
    // (drilldown klik-titik), lihat komentar di sana.
    skip_elapsed_clamp?: boolean;
    division?: number;
    branch_id?: number;
    exclude_intercompany?: boolean;
  }): Promise<CrossSellingData> => {
    const res = await api.get<ApiResponse<CrossSellingData>>('/metrics/cross-selling', { params });
    return res.data.data;
  },

  getCustomerMetrics: async (params?: {
    company_id?: number | 'all';
    period_end?: string;
    // Granularitas trend (task029.md §30.9, 2026-08-22) — mirror getCrossSelling.
    period_type?: 'monthly' | 'quarter' | 'semester' | 'annual';
    // apply_date_cutoff (2026-08-23) — sempat tidak pernah dikirim sama sekali
    // dari sini, jadi toggle "Apply date cutoff" diabaikan total oleh M7
    // walau backend-nya sudah siap terima param ini — mirror getCrossSelling.
    apply_date_cutoff?: boolean;
    division?: number;
    branch_id?: number;
    exclude_intercompany?: boolean;
  }): Promise<CustomerMetricsData> => {
    const res = await api.get<ApiResponse<CustomerMetricsData>>('/metrics/customer-metrics', { params });
    return res.data.data;
  },

  getDormantCustomer: async (params?: {
    company_id?: number | 'all';
    period_end?: string;
    // Granularitas trend (2026-08-24, susulan task029.md §30.9 — M8-M10
    // sebelumnya hardcode bulanan, sekarang mirror getCustomerMetrics.
    period_type?: 'monthly' | 'quarter' | 'semester' | 'annual';
    apply_date_cutoff?: boolean;
    // skip_elapsed_clamp (2026-08-24, koreksi user: threshold dormant
    // dikonfigurasi dalam BULAN bulat — snapshot dormant HARUS di akhir
    // periode kalender, bukan di-potong ke hari-ini/elapsed, kecuali
    // apply_date_cutoff eksplisit diaktifkan) — caller dormant selalu
    // kirim true, lihat Retention/index.tsx & DormantCustomer/index.tsx.
    skip_elapsed_clamp?: boolean;
    division?: number;
    branch_id?: number;
    exclude_intercompany?: boolean;
  }): Promise<DormantData> => {
    const res = await api.get<ApiResponse<DormantData>>('/metrics/dormant-customer', { params });
    return res.data.data;
  },

  // date_from (2026-08-25, task029.md §33 — M3 dipakai di Value page yg
  // SEKARANG py filter granularitas) — pola sama persis getGpBreakdown/getExpansionBreakdown.
  getRevenueBreakdown: async (params: { period_end?: string; date_from?: string; company_id?: number | 'all'; division?: number; branch_id?: number; exclude_intercompany?: boolean }): Promise<RevenueBreakdownData> => {
    const res = await api.get<ApiResponse<RevenueBreakdownData>>('/metrics/revenue-breakdown', { params });
    return res.data.data;
  },

  getExpansionBreakdown: async (params: { period_end?: string; date_from?: string; period_type?: 'monthly' | 'quarter' | 'semester' | 'annual'; company_id?: number | 'all'; division?: number; branch_id?: number; exclude_intercompany?: boolean }): Promise<ExpansionBreakdownData> => {
    const res = await api.get<ApiResponse<ExpansionBreakdownData>>('/metrics/expansion-breakdown', { params });
    return res.data.data;
  },

  // date_from (2026-08-25) — backend SUDAH siap sejak task026 §8e, FE
  // baru sekarang benar-benar mengirimnya (Value page dapat filter granularitas).
  getGpBreakdown: async (params: { period_end?: string; date_from?: string; company_id?: number | 'all'; division?: number; branch_id?: number; exclude_intercompany?: boolean }): Promise<GpBreakdownData> => {
    const res = await api.get<ApiResponse<GpBreakdownData>>('/metrics/gp-breakdown', { params });
    return res.data.data;
  },

  // date_from (2026-08-25, task029.md §33) — pola sama persis getGpBreakdown.
  getHmBreakdown: async (params: { period_end?: string; date_from?: string; company_id?: number | 'all'; division?: number; branch_id?: number; exclude_intercompany?: boolean }): Promise<HmBreakdownData> => {
    const res = await api.get<ApiResponse<HmBreakdownData>>('/metrics/hm-breakdown', { params });
    return res.data.data;
  },

  // date_from (2026-08-24, M6 dipakai di Retention page yg py filter
  // granularitas — pola sama persis getGpBreakdown/getExpansionBreakdown).
  getRorBreakdown: async (params: { period_end?: string; date_from?: string; company_id?: number | 'all'; division?: number; branch_id?: number; exclude_intercompany?: boolean }): Promise<RorBreakdownData> => {
    const res = await api.get<ApiResponse<RorBreakdownData>>('/metrics/ror-breakdown', { params });
    return res.data.data;
  },

  // Drill-down M8 (2026-08-24) — pola sama persis getRorBreakdown.
  getDormantBreakdown: async (params: { period_end?: string; company_id?: number | 'all'; division?: number; branch_id?: number; exclude_intercompany?: boolean }): Promise<DormantBreakdownData> => {
    const res = await api.get<ApiResponse<DormantBreakdownData>>('/metrics/dormant-breakdown', { params });
    return res.data.data;
  },

  // Status per customer utk 1 titik (2026-08-24, susulan pertanyaan user
  // soal ambiguitas reaktivasi) — date_from = awal bucket, period_end =
  // akhir bucket, period_type dipakai hitung window "sebelumnya".
  getDormantStatusBreakdown: async (params: {
    period_end?: string;
    date_from?: string;
    period_type?: 'monthly' | 'quarter' | 'semester' | 'annual';
    company_id?: number | 'all';
    division?: number;
    branch_id?: number;
    exclude_intercompany?: boolean;
    status?: DormantCustomerStatus;
  }): Promise<DormantStatusBreakdownData> => {
    const res = await api.get<ApiResponse<DormantStatusBreakdownData>>('/metrics/dormant-status-breakdown', { params });
    return res.data.data;
  },

  // Riwayat revenue bulanan per customer (2026-08-25) — drill-down klik-bar
  // ranking M9. ref_date = last_invoice_date baris yang diklik (WAJIB,
  // window 12 bulan dihitung mundur dari situ).
  getDormantValueHistory: async (params: {
    customer_id: number;
    ref_date: string;
    company_id?: number | 'all';
    division?: number;
    branch_id?: number;
    exclude_intercompany?: boolean;
  }): Promise<DormantValueHistoryData> => {
    const res = await api.get<ApiResponse<DormantValueHistoryData>>('/metrics/dormant-value-history', { params });
    return res.data.data;
  },
};
