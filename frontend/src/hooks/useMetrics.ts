// src/hooks/useMetrics.ts
import { useQuery } from '@tanstack/react-query';
import { metricsApi } from '@/api/metrics.api';
import type { CrossSellingData, CustomerMetricsData, DormantData } from '@/types/metrics';

const STALE_TIME = 1000 * 60 * 5; // 5 menit

// ── M1, M1.1, M2 — Cross Selling ─────────────────────────────────────────────
export function useCrossSelling() {
  return useQuery<CrossSellingData>({
    queryKey: ['metrics', 'cross-selling'],
    queryFn: metricsApi.getCrossSelling,
    staleTime: STALE_TIME,
  });
}

// ── M3–M7 — Customer Metrics ──────────────────────────────────────────────────
export function useCustomerMetrics(params?: {
  company_id?: number | 'all';
  period_month?: string;
}) {
  return useQuery<CustomerMetricsData>({
    queryKey: ['metrics', 'customer-metrics', params],
    queryFn: () => metricsApi.getCustomerMetrics(params),
    staleTime: STALE_TIME,
  });
}

// ── M8–M10 — Dormant Customer ─────────────────────────────────────────────────
export function useDormantCustomer() {
  return useQuery<DormantData>({
    queryKey: ['metrics', 'dormant-customer'],
    queryFn: metricsApi.getDormantCustomer,
    staleTime: STALE_TIME,
  });
}
