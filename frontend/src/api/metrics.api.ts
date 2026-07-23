// src/api/metrics.api.ts
import { api } from './axios';
import type { ApiResponse } from '@/types/api';
import type { CrossSellingData, CustomerMetricsData, DormantData, RevenueBreakdownData, ExpansionBreakdownData, GpBreakdownData, HmBreakdownData, RorBreakdownData } from '@/types/metrics';

export const metricsApi = {
  getCrossSelling: async (params?: {
    company_id?: number | 'all';
    period_end?: string;
    division?: string;
    branch_id?: number;
    exclude_intercompany?: boolean;
  }): Promise<CrossSellingData> => {
    const res = await api.get<ApiResponse<CrossSellingData>>('/metrics/cross-selling', { params });
    return res.data.data;
  },

  getCustomerMetrics: async (params?: {
    company_id?: number | 'all';
    period_end?: string;
    division?: string;
    branch_id?: number;
    exclude_intercompany?: boolean;
  }): Promise<CustomerMetricsData> => {
    const res = await api.get<ApiResponse<CustomerMetricsData>>('/metrics/customer-metrics', { params });
    return res.data.data;
  },

  getDormantCustomer: async (params?: {
    company_id?: number | 'all';
    period_end?: string;
    division?: string;
    branch_id?: number;
    exclude_intercompany?: boolean;
  }): Promise<DormantData> => {
    const res = await api.get<ApiResponse<DormantData>>('/metrics/dormant-customer', { params });
    return res.data.data;
  },

  getRevenueBreakdown: async (params: { period_end?: string; company_id?: number | 'all'; division?: string; branch_id?: number; exclude_intercompany?: boolean }): Promise<RevenueBreakdownData> => {
    const res = await api.get<ApiResponse<RevenueBreakdownData>>('/metrics/revenue-breakdown', { params });
    return res.data.data;
  },

  getExpansionBreakdown: async (params: { period_end?: string; company_id?: number | 'all'; division?: string; branch_id?: number; exclude_intercompany?: boolean }): Promise<ExpansionBreakdownData> => {
    const res = await api.get<ApiResponse<ExpansionBreakdownData>>('/metrics/expansion-breakdown', { params });
    return res.data.data;
  },

  getGpBreakdown: async (params: { period_end?: string; company_id?: number | 'all'; division?: string; branch_id?: number; exclude_intercompany?: boolean }): Promise<GpBreakdownData> => {
    const res = await api.get<ApiResponse<GpBreakdownData>>('/metrics/gp-breakdown', { params });
    return res.data.data;
  },

  getHmBreakdown: async (params: { period_end?: string; company_id?: number | 'all'; division?: string; branch_id?: number; exclude_intercompany?: boolean }): Promise<HmBreakdownData> => {
    const res = await api.get<ApiResponse<HmBreakdownData>>('/metrics/hm-breakdown', { params });
    return res.data.data;
  },

  getRorBreakdown: async (params: { period_end?: string; company_id?: number | 'all'; division?: string; branch_id?: number; exclude_intercompany?: boolean }): Promise<RorBreakdownData> => {
    const res = await api.get<ApiResponse<RorBreakdownData>>('/metrics/ror-breakdown', { params });
    return res.data.data;
  },
};
