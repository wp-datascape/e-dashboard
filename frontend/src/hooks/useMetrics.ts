// src/hooks/useMetrics.ts
import { useQuery } from '@tanstack/react-query';
import { metricsApi } from '@/api/metrics.api';
import type { CrossSellingData, CustomerMetricsData, DormantData, RevenueBreakdownData, ExpansionBreakdownData, GpBreakdownData, HmBreakdownData, RorBreakdownData } from '@/types/metrics';

const STALE_TIME = 1000 * 60 * 5; // 5 menit

// ── M1, M1.1, M2 — Cross Selling ─────────────────────────────────────────────
export function useCrossSelling(params?: {
  company_id?: number | 'all';
  period_end?: string;
  division?: number;
  branch_id?: number;
  exclude_intercompany?: boolean;
}) {
  return useQuery<CrossSellingData>({
    queryKey: ['metrics', 'cross-selling', params],
    queryFn: () => metricsApi.getCrossSelling(params),
    staleTime: STALE_TIME,
  });
}

// ── M3–M7 — Customer Metrics ──────────────────────────────────────────────────
export function useCustomerMetrics(params?: {
  company_id?: number | 'all';
  period_end?: string;
  division?: number;
  branch_id?: number;
  exclude_intercompany?: boolean;
}) {
  return useQuery<CustomerMetricsData>({
    queryKey: ['metrics', 'customer-metrics', params],
    queryFn: () => metricsApi.getCustomerMetrics(params),
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
export function useExpansionBreakdown(params: { period_end: string | null; company_id?: number | 'all'; division?: number; branch_id?: number; exclude_intercompany?: boolean; date_from?: string }) {
  return useQuery<ExpansionBreakdownData>({
    queryKey: ['metrics', 'expansion-breakdown', params],
    queryFn: () => metricsApi.getExpansionBreakdown({ period_end: params.period_end!, company_id: params.company_id, division: params.division, branch_id: params.branch_id, exclude_intercompany: params.exclude_intercompany, date_from: params.date_from }),
    enabled: !!params.period_end,
    staleTime: STALE_TIME,
  });
}

// ── M4 GP Drill-down ─────────────────────────────────────────────────────────
export function useGpBreakdown(params: { period_end: string | null; company_id?: number | 'all'; division?: number; branch_id?: number; exclude_intercompany?: boolean; date_from?: string }) {
  return useQuery<GpBreakdownData>({
    queryKey: ['metrics', 'gp-breakdown', params],
    queryFn: () => metricsApi.getGpBreakdown({ period_end: params.period_end!, company_id: params.company_id, division: params.division, branch_id: params.branch_id, exclude_intercompany: params.exclude_intercompany, date_from: params.date_from }),
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
export function useDormantCustomer(params?: {
  company_id?: number | 'all';
  period_end?: string;
  division?: number;
  branch_id?: number;
  exclude_intercompany?: boolean;
}) {
  return useQuery<DormantData>({
    queryKey: ['metrics', 'dormant-customer', params],
    queryFn: () => metricsApi.getDormantCustomer(params),
    staleTime: STALE_TIME,
  });
}
