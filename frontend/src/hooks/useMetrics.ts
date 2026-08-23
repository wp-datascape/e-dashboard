// src/hooks/useMetrics.ts
import { useQuery } from '@tanstack/react-query';
import { metricsApi } from '@/api/metrics.api';
import type { CrossSellingData, CustomerMetricsData, DormantData, RevenueBreakdownData, ExpansionBreakdownData, GpBreakdownData, HmBreakdownData, RorBreakdownData } from '@/types/metrics';
import type { DrilldownPeriodParams } from '@/utils/analisisPeriod';

const STALE_TIME = 1000 * 60 * 5; // 5 menit

// ── M1, M1.1, M2 — Cross Selling ─────────────────────────────────────────────
// `enabled` (default true) — dipakai halaman Growth (task029) supaya query
// TIDAK fire sama sekali kalau user tidak punya cross.selling:view, bukan
// fire lalu 403 dari backend (lihat pages/Growth/index.tsx).
export function useCrossSelling(params?: {
  company_id?: number | 'all';
  period_end?: string;
  period_type?: 'monthly' | 'quarter' | 'semester' | 'annual';
  apply_date_cutoff?: boolean;
  division?: number;
  branch_id?: number;
  exclude_intercompany?: boolean;
}, options?: { enabled?: boolean }) {
  return useQuery<CrossSellingData>({
    queryKey: ['metrics', 'cross-selling', params],
    queryFn: () => metricsApi.getCrossSelling(params),
    enabled: options?.enabled ?? true,
    staleTime: STALE_TIME,
  });
}

// ── M2 Drill-down (klik titik chart avg-category) ─────────────────────────────
// Endpoint /metrics/cross-selling scope by period_end (mirror pola gp-breakdown/
// hm-breakdown/ror-breakdown) - re-fetch payload yang sama tapi cuma `.detail` yang
// dipakai di dialog. Belum ada endpoint detail-only terpisah di backend, jadi reuse
// endpoint yang sudah ada (bukan bikin baru) - konsisten dengan cara M1 CS_INV_CTE
// sudah scope by SegmentParams.filterDate per titik bulan.
export function useCrossSellingDetail(params: {
  period_end: string | null;
  company_id?: number | 'all';
  // Dibangun via `buildDrilldownPeriodParams` (utils/analisisPeriod.ts) di
  // sisi caller — SATU tempat pusat yang merakit period_type/apply_date_
  // cutoff/cutoff_day/skip_elapsed_clamp dari state filter halaman, BUKAN
  // diturunkan ulang per hook (2026-08-23, koreksi user: "filter ini
  // fungsinya harus global... rawan bug di metric KPI lainnya" kalau tiap
  // fungsi menulis ulang). Lihat JSDoc `buildDrilldownPeriodParams` dan
  // backend `resolveTrendPeriod` (period.util.ts, prioritas yang sama)
  // untuk penjelasan lengkap kenapa tiap field ini dibutuhkan.
  periodParams: DrilldownPeriodParams;
  division?: number;
  branch_id?: number;
  exclude_intercompany?: boolean;
}) {
  const { periodParams, ...rest } = params;
  return useQuery<CrossSellingData>({
    queryKey: ['metrics', 'cross-selling-detail', params],
    queryFn: () => metricsApi.getCrossSelling({ ...rest, ...periodParams, period_end: params.period_end! }),
    enabled: !!params.period_end,
    staleTime: STALE_TIME,
  });
}

// ── M3–M7 — Customer Metrics ──────────────────────────────────────────────────
// `enabled` (default true) — dipakai halaman Growth/Retention/Value (task029)
// supaya query TIDAK fire kalau user tidak punya expansion:view.
export function useCustomerMetrics(params?: {
  company_id?: number | 'all';
  period_end?: string;
  // Granularitas trend (task029.md §30.9, 2026-08-22) — mirror useCrossSelling.
  period_type?: 'monthly' | 'quarter' | 'semester' | 'annual';
  apply_date_cutoff?: boolean;
  division?: number;
  branch_id?: number;
  exclude_intercompany?: boolean;
}, options?: { enabled?: boolean }) {
  return useQuery<CustomerMetricsData>({
    queryKey: ['metrics', 'customer-metrics', params],
    queryFn: () => metricsApi.getCustomerMetrics(params),
    enabled: options?.enabled ?? true,
    staleTime: STALE_TIME,
  });
}

// ── M3 Revenue Drill-down ─────────────────────────────────────────────────────
export function useRevenueBreakdown(params: { period_end: string | null; company_id?: number | 'all'; division?: number; branch_id?: number; exclude_intercompany?: boolean }) {
  return useQuery<RevenueBreakdownData>({
    queryKey: ['metrics', 'revenue-breakdown', params],
    queryFn: () => metricsApi.getRevenueBreakdown({ period_end: params.period_end!, company_id: params.company_id, division: params.division, branch_id: params.branch_id, exclude_intercompany: params.exclude_intercompany }),
    enabled: !!params.period_end,
    staleTime: STALE_TIME,
  });
}

// ── M7 Expansion Drill-down ───────────────────────────────────────────────────
export function useExpansionBreakdown(params: {
  period_end: string | null;
  company_id?: number | 'all';
  // Granularitas (2026-08-22, bug class sama dgn useCrossSellingDetail) —
  // tanpa ini backend fetchExpansionBreakdown fallback ke window
  // activeMonths lama, bukan rentang penuh bucket yang diklik.
  date_from?: string;
  // period_type (2026-08-23) — dipakai backend menghitung window "sebelumnya"
  // PERIOD-ANCHORED (posisi relatif sama di periode sebelumnya), bukan
  // rolling-window mundur — lihat JSDoc getExpansionBreakdown (backend).
  period_type?: 'monthly' | 'quarter' | 'semester' | 'annual';
  division?: number;
  branch_id?: number;
  exclude_intercompany?: boolean;
}) {
  return useQuery<ExpansionBreakdownData>({
    queryKey: ['metrics', 'expansion-breakdown', params],
    queryFn: () => metricsApi.getExpansionBreakdown({ period_end: params.period_end!, date_from: params.date_from, period_type: params.period_type, company_id: params.company_id, division: params.division, branch_id: params.branch_id, exclude_intercompany: params.exclude_intercompany }),
    enabled: !!params.period_end,
    staleTime: STALE_TIME,
  });
}

// ── M4 GP Drill-down ─────────────────────────────────────────────────────────
export function useGpBreakdown(params: { period_end: string | null; company_id?: number | 'all'; division?: number; branch_id?: number; exclude_intercompany?: boolean }) {
  return useQuery<GpBreakdownData>({
    queryKey: ['metrics', 'gp-breakdown', params],
    queryFn: () => metricsApi.getGpBreakdown({ period_end: params.period_end!, company_id: params.company_id, division: params.division, branch_id: params.branch_id, exclude_intercompany: params.exclude_intercompany }),
    enabled: !!params.period_end,
    staleTime: STALE_TIME,
  });
}

// ── M5 HM Drill-down ─────────────────────────────────────────────────────────
export function useHmBreakdown(params: { period_end: string | null; company_id?: number | 'all'; division?: number; branch_id?: number; exclude_intercompany?: boolean }) {
  return useQuery<HmBreakdownData>({
    queryKey: ['metrics', 'hm-breakdown', params],
    queryFn: () => metricsApi.getHmBreakdown({ period_end: params.period_end!, company_id: params.company_id, division: params.division, branch_id: params.branch_id, exclude_intercompany: params.exclude_intercompany }),
    enabled: !!params.period_end,
    staleTime: STALE_TIME,
  });
}

// ── M6 ROR Drill-down ─────────────────────────────────────────────────────────
export function useRorBreakdown(params: { period_end: string | null; company_id?: number | 'all'; division?: number; branch_id?: number; exclude_intercompany?: boolean }) {
  return useQuery<RorBreakdownData>({
    queryKey: ['metrics', 'ror-breakdown', params],
    queryFn: () => metricsApi.getRorBreakdown({ period_end: params.period_end!, company_id: params.company_id, division: params.division, branch_id: params.branch_id, exclude_intercompany: params.exclude_intercompany }),
    enabled: !!params.period_end,
    staleTime: STALE_TIME,
  });
}

// ── M8–M10 — Dormant Customer ─────────────────────────────────────────────────
// `enabled` (default true) — dipakai halaman Retention (task029) supaya
// query TIDAK fire kalau user tidak punya churn.risk:view.
export function useDormantCustomer(params?: {
  company_id?: number | 'all';
  period_end?: string;
  division?: number;
  branch_id?: number;
  exclude_intercompany?: boolean;
}, options?: { enabled?: boolean }) {
  return useQuery<DormantData>({
    queryKey: ['metrics', 'dormant-customer', params],
    queryFn: () => metricsApi.getDormantCustomer(params),
    enabled: options?.enabled ?? true,
    staleTime: STALE_TIME,
  });
}
