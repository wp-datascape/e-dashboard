// src/api/metrics.api.ts
import { api } from './axios';
import type { ApiResponse } from '@/types/api';
import type { CrossSellingData, CustomerMetricsData, DormantData } from '@/types/metrics';

export const metricsApi = {
  getCrossSelling: async (): Promise<CrossSellingData> => {
    const res = await api.get<ApiResponse<CrossSellingData>>('/metrics/cross-selling');
    return res.data.data;
  },

  getCustomerMetrics: async (): Promise<CustomerMetricsData> => {
    const res = await api.get<ApiResponse<CustomerMetricsData>>('/metrics/customer-metrics');
    return res.data.data;
  },

  getDormantCustomer: async (): Promise<DormantData> => {
    const res = await api.get<ApiResponse<DormantData>>('/metrics/dormant-customer');
    return res.data.data;
  },
};
