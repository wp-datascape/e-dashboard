// src/api/metrics.api.ts
import { api } from './axios';
import type { ApiResponse } from '@/types/api';
import type { CrossSellingData, CustomerMetricsData, DormantData, GpBreakdownData, HmBreakdownData, RorBreakdownData } from '@/types/metrics';

export const metricsApi = {
  getCrossSelling: async (): Promise<CrossSellingData> => {
    const res = await api.get<ApiResponse<CrossSellingData>>('/metrics/cross-selling');
    return res.data.data;
  },

  getCustomerMetrics: async (params?: {
    company_id?: number | 'all';
    period_month?: string;
    division?: string;
  }): Promise<CustomerMetricsData> => {
    const res = await api.get<ApiResponse<CustomerMetricsData>>('/metrics/customer-metrics', { params });
    return res.data.data;
  },

  getDormantCustomer: async (): Promise<DormantData> => {
    const res = await api.get<ApiResponse<DormantData>>('/metrics/dormant-customer');
    return res.data.data;
  },

  getGpBreakdown: async (params: { month: string; company_id?: number | 'all'; division?: string }): Promise<GpBreakdownData> => {
    const res = await api.get<ApiResponse<GpBreakdownData>>('/metrics/gp-breakdown', { params });
    return res.data.data;
  },

  getHmBreakdown: async (params: { month: string; company_id?: number | 'all'; division?: string }): Promise<HmBreakdownData> => {
    const res = await api.get<ApiResponse<HmBreakdownData>>('/metrics/hm-breakdown', { params });
    return res.data.data;
  },

  getRorBreakdown: async (params: { month: string; company_id?: number | 'all'; division?: string }): Promise<RorBreakdownData> => {
    const res = await api.get<ApiResponse<RorBreakdownData>>('/metrics/ror-breakdown', { params });
    return res.data.data;
  },
};
