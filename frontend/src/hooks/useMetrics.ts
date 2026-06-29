// src/hooks/useMetrics.ts
import { useQuery } from '@tanstack/react-query';
import { metricsApi } from '@/api/metrics.api';
import type { CrossSellingData, CustomerMetricsData, DormantData, GpBreakdownData, HmBreakdownData, RorBreakdownData } from '@/types/metrics';

const STALE_TIME = 1000 * 60 * 5; // 5 menit

// ── M1, M1.1, M2 — Cross Selling ─────────────────────────────────────────────
export function useCrossSelling(params?: {
  company_id?: number | 'all';
  period_end?: string;
  division?: string;
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
  period_month?: string;
  division?: string;
}) {
  return useQuery<CustomerMetricsData>({
    queryKey: ['metrics', 'customer-metrics', params],
    queryFn: () => metricsApi.getCustomerMetrics(params),
    staleTime: STALE_TIME,
  });
}

// ── M4 GP Drill-down ─────────────────────────────────────────────────────────
export function useGpBreakdown(params: { month: string | null; company_id?: number | 'all'; division?: string }) {
  return useQuery<GpBreakdownData>({
    queryKey: ['metrics', 'gp-breakdown', params],
    queryFn: () => metricsApi.getGpBreakdown({ month: params.month!, company_id: params.company_id, division: params.division }),
    enabled: !!params.month,
    staleTime: STALE_TIME,
  });
}

// ── M5 HM Drill-down ─────────────────────────────────────────────────────────
export function useHmBreakdown(params: { month: string | null; company_id?: number | 'all'; division?: string }) {
  return useQuery<HmBreakdownData>({
    queryKey: ['metrics', 'hm-breakdown', params],
    queryFn: () => metricsApi.getHmBreakdown({ month: params.month!, company_id: params.company_id, division: params.division }),
    enabled: !!params.month,
    staleTime: STALE_TIME,
  });
}

// ── M6 ROR Drill-down ─────────────────────────────────────────────────────────
export function useRorBreakdown(params: { month: string | null; company_id?: number | 'all'; division?: string }) {
  return useQuery<RorBreakdownData>({
    queryKey: ['metrics', 'ror-breakdown', params],
    queryFn: () => metricsApi.getRorBreakdown({ month: params.month!, company_id: params.company_id, division: params.division }),
    enabled: !!params.month,
    staleTime: STALE_TIME,
  });
}

// ── M8–M10 — Dormant Customer ─────────────────────────────────────────────────
export function useDormantCustomer(params?: {
  company_id?: number | 'all';
  period_month?: string;
  division?: string;
}) {
  return useQuery<DormantData>({
    queryKey: ['metrics', 'dormant-customer', params],
    queryFn: () => metricsApi.getDormantCustomer(params),
    staleTime: STALE_TIME,
  });
}
